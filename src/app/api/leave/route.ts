import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getLeaveService } from '@/lib/leave';

export async function GET(request: NextRequest) {
  try {
    // Get user from token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const leaveService = getLeaveService();
    const leaveRequests = await leaveService.getLeaveRequests(user.id);

    return NextResponse.json({
      success: true,
      data: leaveRequests
    });

  } catch (error) {
    console.error('Get leave requests API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { start_date, end_date, leave_type, reason } = await request.json();

    // Validate input
    if (!start_date || !end_date || !leave_type || !reason) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (!['annual', 'sick', 'personal', 'emergency'].includes(leave_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid leave type' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const leaveService = getLeaveService();
    const result = await leaveService.createLeaveRequest({
      user_id: user.id,
      start_date,
      end_date,
      leave_type,
      reason
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Leave request created successfully',
      leaveRequestId: result.leaveRequestId
    });

  } catch (error) {
    console.error('Create leave request API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leaveRequestId = searchParams.get('id');

    if (!leaveRequestId) {
      return NextResponse.json(
        { success: false, error: 'Leave request ID is required' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const leaveService = getLeaveService();
    const result = await leaveService.deleteLeaveRequest(parseInt(leaveRequestId), user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Leave request deleted successfully'
    });

  } catch (error) {
    console.error('Delete leave request API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}