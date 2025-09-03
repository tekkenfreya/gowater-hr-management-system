import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    await whatsappService.initialize({
      onQR: (qr: string) => {
        // Store QR code for retrieval
        global.whatsappQR = qr;
      },
      onReady: () => {
        global.whatsappReady = true;
      },
      onDisconnected: () => {
        global.whatsappReady = false;
      },
      onAuthFailure: (error: string) => {
        global.whatsappError = error;
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize WhatsApp' },
      { status: 500 }
    );
  }
}