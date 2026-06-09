import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';

export const runtime = 'nodejs';

// Returns the currently logged-in admin username (middleware already gates this).
export async function GET(request: NextRequest) {
  const username = await verifySession(
    request.cookies.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );
  if (!username) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ username });
}
