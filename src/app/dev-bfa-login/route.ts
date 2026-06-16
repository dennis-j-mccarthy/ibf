// DEV + PREVIEW ONLY — one-click "skip login" for the Book Fair Admin dashboard.
// Gated on VERCEL_ENV so it works locally and on Vercel PREVIEW deployments but
// returns 404 on the real production deployment. Lives outside the
// /book-fair-admin prefix on purpose, so middleware's auth gate doesn't
// intercept it. Revert by deleting this file (src/app/dev-bfa-login/).
import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  signSessionToken,
} from '@/lib/book-fair-admin/auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    return new NextResponse('AUTH_JWT_SECRET is not set', { status: 500 });
  }

  // Pick any school via ?school=<id> (defaults to The Saint Constantine School).
  const schoolId = Number(new URL(request.url).searchParams.get('school')) || 1363;
  const session = await signSessionToken({ userId: 0, schoolId }, secret);

  // Pass a ?step=N preview param through to the dashboard if present.
  const step = new URL(request.url).searchParams.get('step');
  const dest = step ? `/book-fair-admin?step=${encodeURIComponent(step)}` : '/book-fair-admin';
  const response = NextResponse.redirect(new URL(dest, request.url));
  response.cookies.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
