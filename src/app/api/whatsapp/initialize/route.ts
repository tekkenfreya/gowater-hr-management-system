import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    await whatsappService.initialize({
      onQR: (qr: string) => {
        // Store QR code for retrieval
        (global as unknown as Record<string, unknown>).whatsappQR = qr;
      },
      onReady: () => {
        (global as unknown as Record<string, unknown>).whatsappReady = true;
      },
      onDisconnected: () => {
        (global as unknown as Record<string, unknown>).whatsappReady = false;
      },
      onAuthFailure: (error: string) => {
        (global as unknown as Record<string, unknown>).whatsappError = error;
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