import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { getAuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    logger.debug('=== Team Members API Called ===');

    const token = request.cookies.get('auth-token')?.value;
    logger.debug('Token exists:', !!token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      logger.debug('Token verified successfully');
    } catch (jwtError) {
      logger.error('JWT verification failed', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    logger.debug('Getting services...');
    const authService = getAuthService();
    const db = getDb();
    logger.debug('Services obtained');

    // Fetch all users using AuthService
    logger.debug('Fetching users from AuthService...');
    const allUsers = await authService.getAllUsers();
    logger.debug('All users from AuthService:', allUsers);
    logger.debug('Number of users found:', allUsers.length);

    // If no users found from AuthService, try direct query to debug
    if (allUsers.length === 0) {
      logger.debug('No users from AuthService, trying direct query...');
      const directUsers = await db.all('users', {});
      logger.debug('Direct query all users (no filter):', directUsers);
    }

    // Fetch today's attendance for all users
    const today = new Date().toISOString().split('T')[0];
    logger.debug('Fetching attendance for date:', today);

    const attendanceRecords = await db.all('attendance', { date: today });

    logger.debug('Attendance records:', attendanceRecords);
    logger.debug('Number of attendance records:', Array.isArray(attendanceRecords) ? attendanceRecords.length : 0);

    // Create a map of user_id to attendance status
    const attendanceMap = new Map<number, { isOnline: boolean }>();
    if (Array.isArray(attendanceRecords)) {
      attendanceRecords.forEach((record: { user_id: number; check_in_time: string | null; check_out_time: string | null }) => {
        attendanceMap.set(record.user_id, {
          isOnline: !!record.check_in_time && !record.check_out_time
        });
      });
    }

    // Map users with their attendance status
    const allEmployees = allUsers.map((user: { id: number; name: string; email: string; employeeId?: string; employee_id?: string; role: string; position?: string; department?: string; avatar?: string }) => {
      const attendance = attendanceMap.get(user.id) || { isOnline: false };
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || user.employee_id || '',
        role: user.role,
        position: user.position || '',
        department: user.department || '',
        avatar: user.avatar || null,
        isOnline: attendance.isOnline,
        isBoss: user.employeeId === 'R-001' || user.employeeId === 'R-005' || user.employee_id === 'R-001' || user.employee_id === 'R-005'
      };
    });

    // Sort: bosses first, then by employee ID
    allEmployees.sort((a: { isBoss: boolean; employeeId: string }, b: { isBoss: boolean; employeeId: string }) => {
      if (a.isBoss && !b.isBoss) return -1;
      if (!a.isBoss && b.isBoss) return 1;
      return (a.employeeId || '').localeCompare(b.employeeId || '');
    });

    logger.debug('Final employees array:', allEmployees);
    logger.debug('Number of final employees:', allEmployees.length);

    return NextResponse.json({
      success: true,
      employees: allEmployees
    });

  } catch (error) {
    logger.error('Get team members API error', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
