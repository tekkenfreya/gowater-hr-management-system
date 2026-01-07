import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';

/**
 * GET /api/team/members
 * Get all team members (available to all authenticated users)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is authenticated
    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get all active users
    const users = await authService.getAllUsers();

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get team members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}
