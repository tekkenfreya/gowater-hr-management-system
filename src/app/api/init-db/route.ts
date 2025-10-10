import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Security: Disable endpoint in production environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Database initialization is disabled in production' },
        { status: 403 }
      );
    }

    // Security: Require initialization secret key
    const initKey = request.headers.get('x-init-key');
    const expectedKey = process.env.DB_INIT_SECRET;

    if (!expectedKey) {
      return NextResponse.json(
        { error: 'Database initialization is not configured' },
        { status: 500 }
      );
    }

    if (initKey !== expectedKey) {
      console.warn('Failed database initialization attempt - invalid key');
      return NextResponse.json(
        { error: 'Unauthorized - invalid initialization key' },
        { status: 401 }
      );
    }

    console.log('Starting database initialization...');

    const authService = getAuthService();
    await authService.initialize();

    console.log('Database initialized successfully');

    return NextResponse.json({
      message: 'Database initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to initialize database',
    endpoint: '/api/init-db'
  });
}