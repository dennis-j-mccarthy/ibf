// LOCAL DEV ONLY — mints an admin session cookie without the magic-link flow so
// the recorder (and other admin tools) can be tested on localhost. Hard-404s in
// production, so it is inert on the live site. Remove (or leave dev-gated)
// before merging to main.
import { NextRequest, NextResponse } from 'next/server';
import { signSession, COOKIE_NAME, DEFAULT_TTL_MS } from '@/lib/auth/session';
import { allowedAdminEmails } from '@/lib/auth/admin-allowlist';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    return new NextResponse('ADMIN_SESSION_SECRET is not set in .env.local', { status: 500 });
  }
  // Sign in as the first built-in admin (Dennis) so admin-only areas pass.
  // ?as=<email> switches to another allowlisted admin, so per-person behavior
  // (e.g. who sees the tutorial Publish button) is testable locally.
  const allowed = [...allowedAdminEmails()];
  const asParam = request.nextUrl.searchParams.get('as')?.trim().toLowerCase();
  const email = (asParam && allowed.includes(asParam) ? asParam : allowed[0]) || 'dev-admin@avemaria.edu';

  const nextParam = request.nextUrl.searchParams.get('next');
  const next =
    nextParam && nextParam.startsWith('/admin') ? nextParam : '/admin/tutorials/record';

  const session = await signSession(email, secret);
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: false, // localhost is http
    sameSite: 'lax',
    path: '/',
    maxAge: DEFAULT_TTL_MS / 1000,
  });
  return response;
}
