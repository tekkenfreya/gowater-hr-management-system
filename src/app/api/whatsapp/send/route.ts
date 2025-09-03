import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    if (!whatsappService.isClientReady()) {
      return NextResponse.json(
        { error: 'WhatsApp client is not ready' },
        { status: 400 }
      );
    }

    const { recipients, message, type } = await request.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const results = await whatsappService.sendBulkMessage(recipients, message, type || 'manual');

    return NextResponse.json({
      success: true,
      results: {
        successful: results.successful,
        failed: results.failed
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}