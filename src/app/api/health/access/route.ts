import { NextRequest, NextResponse } from 'next/server';
import { HEALTH_COOKIE, accessToken, checkPassword } from '@/lib/health/access';

export async function POST(request: NextRequest) {
  let payload: { password?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (!checkPassword(payload.password ?? '')) {
    return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(HEALTH_COOKIE, accessToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
