import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, event, properties } = await request.json();

    if (!sessionId || !event) {
      return NextResponse.json(
        { error: 'sessionId and event are required' },
        { status: 400 }
      );
    }

    const funnelEvent = await prisma.formFunnelEvent.create({
      data: {
        sessionId,
        event,
        orgType: properties?.orgType || null,
        schoolType: properties?.schoolType || null,
        state: properties?.state || null,
        rep: properties?.rep || null,
        properties: properties ? JSON.stringify(properties) : null,
      },
    });

    return NextResponse.json({ success: true, id: funnelEvent.id });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
