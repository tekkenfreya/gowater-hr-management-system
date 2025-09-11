import { getDb } from './supabase';

export interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  breakDuration?: number;
  totalHours: number;
  status: 'present' | 'absent' | 'late' | 'on_duty';
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

  async checkIn(userId: number, notes?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already checked in today
      const existing = await this.db.get('attendance', { user_id: userId, date: today });

      if (existing && existing.check_in_time && !existing.check_out_time) {
        return { success: false, error: 'Already checked in today' };
      }

      const checkInTime = new Date().toISOString();
      const currentHour = new Date().getHours();
      const status = currentHour >= 10 ? 'late' : 'present'; // Assuming 10 AM is the standard time

      if (existing) {
        // Update existing record
        await this.db.update('attendance', {
          check_in_time: checkInTime,
          status,
          notes,
          updated_at: new Date()
        }, { id: existing.id });
      } else {
        // Create new record
        await this.db.insert('attendance', {
          user_id: userId,
          date: today,
          check_in_time: checkInTime,
          status,
          notes
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Check-in error:', error);
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

      const checkOutTime = new Date().toISOString();
      const checkInTime = new Date(record.check_in_time);
      const totalHours = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      await this.db.update('attendance', {
        check_out_time: checkOutTime,
        total_hours: totalHours,
        notes,
        updated_at: new Date()
      }, { id: record.id });

      return { success: true, totalHours };
    } catch (error) {
      console.error('Check-out error:', error);
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
        breakDuration: record.break_duration || 0,
        totalHours: record.total_hours || 0,
        status: record.status,
        notes: record.notes
      };
    } catch (error) {
      console.error('Get today attendance error:', error);
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
        notes: record.notes
      }));
    } catch (error) {
      console.error('Get weekly attendance error:', error);
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
      console.error('Get attendance summary error:', error);
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
      console.error('Delete attendance error:', error);
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
      console.error('Start break error:', error);
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
      console.error('End break error:', error);
      return { success: false, error: 'Failed to end break' };
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