import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getAttendanceService } from '@/lib/attendance';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { notes } = await request.json();

    const attendanceService = getAttendanceService();
    const result = await attendanceService.checkOut(user.id, notes);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: 'Checked out successfully',
      totalHours: result.totalHours 
    });
  } catch (error) {
    console.error('Check-out API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}