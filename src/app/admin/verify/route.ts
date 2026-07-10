// Magic-link landing for admin sign-in: validates the emailed token,
// re-checks the allowlist at click time (so a removed admin can't reuse an
// old link), then sets the standard ibf_admin session cookie.
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminMagicLink } from '@/lib/auth/magic-link';
import { isAllowedAdminEmail, isAllowedStaffOrAdmin } from '@/lib/auth/admin-allowlist';
import { signSession, COOKIE_NAME, DEFAULT_TTL_MS } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const fail = () =>
    NextResponse.redirect(new URL('/admin/login?error=link', request.url));

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error('ADMIN_SESSION_SECRET is not set');
    return fail();
  }

  const token = request.nextUrl.searchParams.get('token') ?? undefined;
  const email = await verifyAdminMagicLink(token, secret);
  if (!email) return fail();

  // Re-authorize at click time — the allowlist may have changed since the
  // link was issued.
  if (!isAllowedStaffOrAdmin(email)) return fail();

  // Full admins land on the admin dashboard; staff-only users land on the
  // Upcoming Fairs list (the only /admin area they may see).
  const fallback = isAllowedAdminEmail(email) ? '/admin' : '/admin/fairs';
  // Only honor a same-origin admin sub-page as the post-login destination.
  const nextParam = request.nextUrl.searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/admin/') && nextParam !== '/admin/login'
      ? nextParam
      : fallback;

  const session = await signSession(email, secret);
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_TTL_MS / 1000,
  });
  return response;
}
