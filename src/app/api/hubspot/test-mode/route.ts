import { NextRequest, NextResponse } from 'next/server';
import { isTestModeEnabled, setTestMode } from '@/lib/testMode';

export async function GET() {
  return NextResponse.json({ testMode: isTestModeEnabled() });
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  const { enabled } = await request.json();
  setTestMode(!!enabled);

  return NextResponse.json({ testMode: isTestModeEnabled() });
}
