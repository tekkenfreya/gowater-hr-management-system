import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  try {
    const isReady = whatsappService.isClientReady();
    const qrCode = whatsappService.getCurrentQRCode();
    
    return NextResponse.json({
      isReady,
      qrCode,
      error: (global as unknown as Record<string, unknown>).whatsappError || null
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}