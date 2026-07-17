import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, COOKIE_NAME, DEFAULT_TTL_MS } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server not configured (missing ADMIN_SESSION_SECRET)' }, { status: 500 });
  }

  const { username, password } = await request.json();
  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const user = await prisma.adminUser.findUnique({ where: { username } });
  // Verify even when the user is missing-ish to keep timing similar; result is still a generic error.
  const ok = user ? verifyPassword(password, user.passwordHash) : false;
  if (!ok || !user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // Sign the session with the mapped allowlisted email (falls back to username
  // for legacy rows) so admin authorization checks pass.
  const token = await signSession(user.email ?? user.username, secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_TTL_MS / 1000,
  });
  return response;
}
