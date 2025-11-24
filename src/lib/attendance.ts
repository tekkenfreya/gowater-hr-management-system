import { getDb } from './supabase';
import { logger } from './logger';
import { getPhilippineHour } from './timezone';
import {
  AttendanceManagementFilters,
  AttendanceRecordWithUser,
  AttendanceManagementResponse,
  BulkAttendanceOperation
} from '@/types/attendance';

export interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  breakDuration?: number;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'on_duty';
  workLocation?: 'WFH' | 'Onsite';
  notes?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalHours: number;
}

export class AttendanceService {
  private db = getDb();

  async checkIn(userId: number, notes?: string, workLocation?: 'WFH' | 'Onsite'): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Check if already checked in today (without checkout)
      const existing = await this.db.get('attendance', { user_id: userId, date: today });

      if (existing && existing.check_in_time && !existing.check_out_time) {
        return { success: false, error: 'Already checked in. Please check out first.' };
      }

      const checkInTime = new Date().toISOString();
      const currentHour = getPhilippineHour(checkInTime);
      const status = currentHour >= 10 ? 'late' : 'present'; // 10 AM Philippine Time is the standard time

      if (existing && existing.check_out_time) {
        // Already checked out today - this is a new session
        // Add previous session to sessions array
        const sessions = existing.sessions || [];
        sessions.push({
          checkIn: existing.check_in_time,
          checkOut: existing.check_out_time
        });

        // Reset check_in_time for new session, but keep accumulated total_hours and sessions
        await this.db.update('attendance', {
          check_in_time: checkInTime,
          check_out_time: null, // Clear checkout for new session
          work_location: workLocation || 'WFH',
          notes: notes ? `${existing.notes || ''}\n${notes}` : existing.notes,
          sessions: JSON.stringify(sessions),
          updated_at: new Date()
        }, { id: existing.id });
      } else {
        // First check-in of the day
        await this.db.insert('attendance', {
          user_id: userId,
          date: today,
          check_in_time: checkInTime,
          status,
          work_location: workLocation || 'WFH',
          notes,
          total_hours: 0
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Check-in error', error);
      return { success: false, error: 'Failed to check in' };
    }
  }

  async checkOut(userId: number, notes?: string): Promise<{ success: boolean; error?: string; totalHours?: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record || !record.check_in_time) {
        return { success: false, error: 'No check-in found for today' };
      }

      if (record.check_out_time) {
        return { success: false, error: 'Already checked out for this session' };
      }

      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(record.check_in_time);
      const sessionHours = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // Subtract break time from session hours
      const breakDurationHours = (record.break_duration || 0) / 3600; // Convert seconds to hours
      const workingSessionHours = sessionHours - breakDurationHours;

      // Add current session working hours to existing total_hours (accumulate)
      const previousTotalHours = record.total_hours || 0;
      const newTotalHours = previousTotalHours + workingSessionHours;

      await this.db.update('attendance', {
        check_out_time: checkOutTime,
        total_hours: newTotalHours, // Accumulate hours (excluding break time)
        notes: notes ? `${record.notes || ''}\n${notes}` : record.notes,
        updated_at: new Date()
      }, { id: record.id });

      return { success: true, totalHours: newTotalHours };
    } catch (error) {
      logger.error('Check-out error', error);
      return { success: false, error: 'Failed to check out' };
    }
  }

  async getTodayAttendance(userId: number): Promise<AttendanceRecord | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record) return null;

      return {
        id: record.id,
        userId: record.user_id,
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        breakStartTime: record.break_start_time,
        breakEndTime: record.break_end_time,
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        workLocation: record.work_location as 'WFH' | 'Onsite',
        notes: record.notes
      };
    } catch (error) {
      logger.error('Get today attendance error', error);
      return null;
    }
  }

  async getWeeklyAttendance(userId: number, startDate: string): Promise<AttendanceRecord[]> {
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      
      const records = await this.db.all('attendance', {
        user_id: userId,
        date_range: [startDate, endDate.toISOString().split('T')[0]]
      }, 'date');

      return records.map(record => ({
        id: record.id,
        userId: record.user_id,
        date: record.date,
        checkInTime: record.check_in_time,
        checkOutTime: record.check_out_time,
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        workLocation: record.work_location as 'WFH' | 'Onsite',
        notes: record.notes
      }));
    } catch (error) {
      logger.error('Get weekly attendance error', error);
      return [];
    }
  }

  async getAttendanceSummary(userId: number, startDate: string, endDate: string): Promise<AttendanceSummary> {
    try {
      const summaryResult = await this.db.executeRawSQL(`
        SELECT 
          COUNT(*) as totalDays,
          SUM(CASE WHEN status IN ('present', 'late', 'on_duty') THEN 1 ELSE 0 END) as presentDays,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absentDays,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as lateDays,
          SUM(total_hours) as totalHours
        FROM attendance 
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `, [userId, startDate, endDate]);

      const summary = summaryResult[0];

      return {
        totalDays: parseInt(summary?.totaldays) || 0,
        presentDays: parseInt(summary?.presentdays) || 0,
        absentDays: parseInt(summary?.absentdays) || 0,
        lateDays: parseInt(summary?.latedays) || 0,
        totalHours: parseFloat(summary?.totalhours) || 0
      };
    } catch (error) {
      logger.error('Get attendance summary error', error);
      return {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalHours: 0
      };
    }
  }

  async deleteTodayAttendance(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const existing = await this.db.get('attendance', { user_id: userId, date: today });
      
      if (!existing) {
        return { success: false, error: 'No attendance record found for today' };
      }

      await this.db.delete('attendance', { id: existing.id });
      
      return { success: true };
    } catch (error) {
      logger.error('Delete attendance error', error);
      return { success: false, error: 'Failed to delete attendance record' };
    }
  }

  async startBreak(userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const record = await this.db.get('attendance', { user_id: userId, date: today });
      
      if (!record) {
        return { success: false, error: 'No attendance record found for today' };
      }

      if (!record.check_in_time) {
        return { success: false, error: 'Must check in before taking a break' };
      }

      if (record.break_start_time && !record.break_end_time) {
        return { success: false, error: 'Break already in progress' };
      }

      const breakStartTime = new Date().toISOString();
      
      await this.db.update('attendance', {
        break_start_time: breakStartTime,
        break_end_time: null,
        updated_at: new Date()
      }, { id: record.id });

      return { success: true };
    } catch (error) {
      logger.error('Start break error', error);
      return { success: false, error: 'Failed to start break' };
    }
  }

  async endBreak(userId: number): Promise<{ success: boolean; error?: string; breakDuration?: number }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const record = await this.db.get('attendance', { user_id: userId, date: today });

      if (!record) {
        return { success: false, error: 'No attendance record found for today' };
      }

      if (!record.break_start_time || record.break_end_time) {
        return { success: false, error: 'No active break to end' };
      }

      const breakEndTime = new Date().toISOString();
      const breakStartTime = new Date(record.break_start_time);
      const breakDurationSeconds = Math.floor((new Date(breakEndTime).getTime() - breakStartTime.getTime()) / 1000);
      const totalBreakDuration = (record.break_duration || 0) + breakDurationSeconds;

      await this.db.update('attendance', {
        break_end_time: breakEndTime,
        break_duration: totalBreakDuration,
        updated_at: new Date()
      }, { id: record.id });

      return { success: true, breakDuration: breakDurationSeconds };
    } catch (error) {
      logger.error('End break error', error);
      return { success: false, error: 'Failed to end break' };
    }
  }

  /**
   * ADMIN METHODS
   * Methods below are for admin attendance management
   */

  /**
   * Get all users' attendance records with filters and pagination
   */
  async getAllUsersAttendance(filters: AttendanceManagementFilters = {}): Promise<AttendanceManagementResponse> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      // Build WHERE clause
      const conditions: string[] = ['1=1'];
      const params: (string | number)[] = [];
      let paramIndex = 1;

      if (filters.userId) {
        conditions.push(`a.user_id = $${paramIndex++}`);
        params.push(filters.userId);
      }

      if (filters.startDate) {
        conditions.push(`a.date >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push(`a.date <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      if (filters.status) {
        conditions.push(`a.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.workLocation) {
        conditions.push(`a.work_location = $${paramIndex++}`);
        params.push(filters.workLocation);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM attendance a
        WHERE ${whereClause}
      `;

      const countResult = await this.db.executeRawSQL(countQuery, params);
      const total = parseInt(countResult[0]?.total || '0');

      // Get paginated records with user details
      const recordsQuery = `
        SELECT
          a.id,
          a.user_id,
          u.name as user_name,
          u.email as user_email,
          u.department as user_department,
          a.date,
          a.check_in_time,
          a.check_out_time,
          a.break_start_time,
          a.break_end_time,
          a.break_duration,
          a.total_hours,
          a.status,
          a.work_location,
          a.notes,
          CASE
            WHEN a.notes LIKE '%Automated%' THEN true
            ELSE false
          END as is_automated
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE ${whereClause}
        ORDER BY a.date DESC, a.check_in_time DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      const records = await this.db.executeRawSQL(recordsQuery, [...params, limit, offset]);

      const mappedRecords: AttendanceRecordWithUser[] = records.map((r: {
        id: number;
        user_id: number;
        user_name: string;
        user_email: string;
        user_department: string;
        date: string;
        check_in_time?: string;
        check_out_time?: string;
        break_start_time?: string;
        break_end_time?: string;
        break_duration?: number;
        total_hours: number;
        status: 'present' | 'absent' | 'late' | 'on_duty' | 'leave';
        work_location?: 'WFH' | 'Onsite';
        notes?: string;
        is_automated: boolean;
      }) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userEmail: r.user_email,
        userDepartment: r.user_department,
        date: r.date,
        checkInTime: r.check_in_time,
        checkOutTime: r.check_out_time,
        breakStartTime: r.break_start_time,
        breakEndTime: r.break_end_time,
        breakDuration: r.break_duration || 0,
        totalHours: r.total_hours || 0,
        status: r.status,
        workLocation: r.work_location,
        notes: r.notes,
        isAutomated: r.is_automated
      }));

      return {
        records: mappedRecords,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Get all users attendance error', error);
      return {
        records: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0
      };
    }
  }

  /**
   * Bulk update or delete attendance records (admin only)
   */
  async bulkUpdateAttendance(operation: BulkAttendanceOperation): Promise<{ success: boolean; affected: number; error?: string }> {
    try {
      if (operation.attendanceIds.length === 0) {
        return { success: false, affected: 0, error: 'No attendance IDs provided' };
      }

      if (operation.type === 'delete') {
        // Delete multiple records
        for (const id of operation.attendanceIds) {
          await this.db.delete('attendance', { id });
        }

        return { success: true, affected: operation.attendanceIds.length };
      } else if (operation.type === 'update' && operation.updates) {
        // Update multiple records
        const updateData: Record<string, unknown> = {
          updated_at: new Date()
        };

        if (operation.updates.status) {
          updateData.status = operation.updates.status;
        }

        if (operation.updates.workLocation) {
          updateData.work_location = operation.updates.workLocation;
        }

        if (operation.updates.notes) {
          updateData.notes = operation.updates.notes;
        }

        for (const id of operation.attendanceIds) {
          await this.db.update('attendance', updateData, { id });
        }

        return { success: true, affected: operation.attendanceIds.length };
      }

      return { success: false, affected: 0, error: 'Invalid operation type' };
    } catch (error) {
      logger.error('Bulk update attendance error', error);
      return { success: false, affected: 0, error: 'Failed to perform bulk operation' };
    }
  }

  /**
   * Delete a specific attendance record (admin only)
   */
  async deleteAttendanceRecord(attendanceId: number, adminId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await this.db.get('attendance', { id: attendanceId });

      if (!record) {
        return { success: false, error: 'Attendance record not found' };
      }

      await this.db.delete('attendance', { id: attendanceId });

      logger.info(`Attendance record ${attendanceId} deleted by admin ${adminId}`);

      return { success: true };
    } catch (error) {
      logger.error('Delete attendance record error', error);
      return { success: false, error: 'Failed to delete attendance record' };
    }
  }

  /**
   * Get attendance statistics for admin dashboard
   */
  async getAttendanceStatistics(startDate?: string, endDate?: string): Promise<{
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    averageHours: number;
    automatedCount: number;
  }> {
    try {
      const conditions: string[] = ['1=1'];
      const params: string[] = [];
      let paramIndex = 1;

      if (startDate) {
        conditions.push(`date >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`date <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      const query = `
        SELECT
          COUNT(*) as total_records,
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_count,
          SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_count,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_count,
          AVG(total_hours) as average_hours,
          SUM(CASE WHEN notes LIKE '%Automated%' THEN 1 ELSE 0 END) as automated_count
        FROM attendance
        WHERE ${whereClause}
      `;

      const result = await this.db.executeRawSQL(query, params);
      const stats = result[0] || {};

      return {
        totalRecords: parseInt(stats.total_records) || 0,
        presentCount: parseInt(stats.present_count) || 0,
        absentCount: parseInt(stats.absent_count) || 0,
        lateCount: parseInt(stats.late_count) || 0,
        averageHours: parseFloat(stats.average_hours) || 0,
        automatedCount: parseInt(stats.automated_count) || 0
      };
    } catch (error) {
      logger.error('Get attendance statistics error', error);
      return {
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        averageHours: 0,
        automatedCount: 0
      };
    }
  }
}

let attendanceServiceInstance: AttendanceService | null = null;

export function getAttendanceService(): AttendanceService {
  if (!attendanceServiceInstance) {
    attendanceServiceInstance = new AttendanceService();
  }
  return attendanceServiceInstance;
}