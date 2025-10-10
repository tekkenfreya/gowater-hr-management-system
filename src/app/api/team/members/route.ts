import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { getAuthService } from '@/lib/auth';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== Team Members API Called ===');

    const token = request.cookies.get('auth-token')?.value;
    console.log('Token exists:', !!token);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      console.log('Token verified successfully');
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Getting services...');
    const authService = getAuthService();
    const db = getDb();
    console.log('Services obtained');

    // Fetch all users using AuthService
    console.log('Fetching users from AuthService...');
    const allUsers = await authService.getAllUsers();
    console.log('All users from AuthService:', allUsers);
    console.log('Number of users found:', allUsers.length);

    // If no users found from AuthService, try direct query to debug
    if (allUsers.length === 0) {
      console.log('No users from AuthService, trying direct query...');
      const directUsers = await db.all('users', {});
      console.log('Direct query all users (no filter):', directUsers);
    }

    // Fetch today's attendance for all users
    const today = new Date().toISOString().split('T')[0];
    console.log('Fetching attendance for date:', today);

    const attendanceRecords = await db.all('attendance', { date: today });

    console.log('Attendance records:', attendanceRecords);
    console.log('Number of attendance records:', Array.isArray(attendanceRecords) ? attendanceRecords.length : 0);

    // Create a map of user_id to attendance status
    const attendanceMap = new Map();
    if (Array.isArray(attendanceRecords)) {
      attendanceRecords.forEach((record: any) => {
        attendanceMap.set(record.user_id, {
          isOnline: !!record.check_in_time && !record.check_out_time
        });
      });
    }

    // Map users with their attendance status
    const allEmployees = allUsers.map((user: any) => {
      const attendance = attendanceMap.get(user.id) || { isOnline: false };
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId || user.employee_id || '',
        role: user.role,
        position: user.position || '',
        department: user.department || '',
        isOnline: attendance.isOnline,
        isBoss: user.employeeId === 'R-001' || user.employeeId === 'R-005' || user.employee_id === 'R-001' || user.employee_id === 'R-005'
      };
    });

    // Sort: bosses first, then by employee ID
    allEmployees.sort((a: any, b: any) => {
      if (a.isBoss && !b.isBoss) return -1;
      if (!a.isBoss && b.isBoss) return 1;
      return (a.employeeId || '').localeCompare(b.employeeId || '');
    });

    console.log('Final employees array:', allEmployees);
    console.log('Number of final employees:', allEmployees.length);

    return NextResponse.json({
      success: true,
      employees: allEmployees
    });

  } catch (error) {
    console.error('=== Get team members API error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error object:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
