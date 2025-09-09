import { NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';

export async function POST() {
  try {
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
      { error: 'Failed to initialize database', details: error },
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