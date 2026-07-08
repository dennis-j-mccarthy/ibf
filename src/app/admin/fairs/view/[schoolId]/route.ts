// Staff "view as coordinator": mint a book-fair-admin session for a school and
// open its dashboard, so staff can see exactly what a coordinator sees. This is
// the PRODUCTION-safe counterpart to /dev-bfa-login (which 404s in prod) —
// access is gated to authenticated staff/admins, re-checked here defensively on
// top of the middleware /admin gate.
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedStaffOrAdmin } from '@/lib/auth/admin-allowlist';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSessionToken,
} from '@/lib/book-fair-admin/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const email = await verifySession(
    request.cookies.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );
  if (!email || !isAllowedStaffOrAdmin(email)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  const { schoolId } = await params;
  const sid = Number(schoolId);
  const secret = process.env.AUTH_JWT_SECRET;
  if (!Number.isInteger(sid) || sid <= 0 || !secret) {
    return NextResponse.redirect(new URL('/admin/fairs', request.url));
  }

  const session = await signSessionToken({ userId: 0, schoolId: sid }, secret);
  const response = NextResponse.redirect(new URL('/book-fair-admin', request.url));
  response.cookies.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
