// Magic-link landing route: validates the emailed token, re-runs the
// authorization SELECT (so revoked coordinators can't reuse links), and sets
// the stateless session cookie.
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifyMagicLinkToken,
  safeNextPath,
} from '@/lib/book-fair-admin/auth';
import { getSchool } from '@/lib/book-fair-admin/queries';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const fail = () =>
    NextResponse.redirect(new URL('/book-fair-admin/login?error=link', request.url));

  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    console.error('AUTH_JWT_SECRET is not set');
    return fail();
  }

  const token = request.nextUrl.searchParams.get('token') ?? undefined;
  const claims = await verifyMagicLinkToken(token, secret);
  if (!claims) return fail();

  // Re-validate at click time: the school must still exist.
  let school;
  try {
    school = await getSchool(claims.school_id);
  } catch (error) {
    console.error('Verify school check failed:', error);
    return fail();
  }
  if (!school) return fail();

  const session = await signSessionToken(
    { userId: claims.user_id, schoolId: claims.school_id },
    secret
  );
  const destination = safeNextPath(request.nextUrl.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
