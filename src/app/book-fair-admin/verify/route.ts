// Magic-link landing route: validates the emailed token, re-runs the
// authorization SELECT (so revoked coordinators can't reuse links), and sets
// the stateless session cookie.
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifyMagicLinkToken,
} from '@/lib/book-fair-admin/auth';
import { getCoordinatorByBcUserId } from '@/lib/book-fair-admin/queries';

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

  // Re-check authorization at click time: the profile must still exist and
  // still belong to the same user the link was issued for.
  let coordinator;
  try {
    coordinator = await getCoordinatorByBcUserId(claims.bc_user_id);
  } catch (error) {
    console.error('Verify authorization check failed:', error);
    return fail();
  }
  if (!coordinator || coordinator.userId !== claims.user_id) return fail();

  const session = await signSessionToken(
    { userId: coordinator.userId, schoolId: coordinator.schoolId },
    secret
  );
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
