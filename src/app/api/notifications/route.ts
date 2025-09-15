import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getNotificationService } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
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

    const notificationService = getNotificationService();
    const notifications = await notificationService.getUserNotifications(user.id, unreadOnly);

    return NextResponse.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Get notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { notificationId, action } = await request.json();

    if (!notificationId || !action) {
      return NextResponse.json(
        { success: false, error: 'Notification ID and action are required' },
        { status: 400 }
      );
    }

    if (!['read', 'readAll'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "read" or "readAll"' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
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

    const notificationService = getNotificationService();
    let result;

    if (action === 'read') {
      result = await notificationService.markAsRead(parseInt(notificationId), user.id);
    } else {
      result = await notificationService.markAllAsRead(user.id);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: action === 'read' ? 'Notification marked as read' : 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Update notifications API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Get user from token
    const token = request.cookies.get('auth-token')?.value;
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

    const notificationService = getNotificationService();
    const result = await notificationService.deleteNotification(parseInt(notificationId), user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}