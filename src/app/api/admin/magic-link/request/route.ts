import { NextRequest, NextResponse } from 'next/server';
import { signAdminMagicLink } from '@/lib/auth/magic-link';
import { isAllowedStaffOrAdmin } from '@/lib/auth/admin-allowlist';
import { sendAdminMagicLinkEmail } from '@/lib/auth/email';
import { allowAdminLinkRequest } from '@/lib/auth/rate-limit';

export const runtime = 'nodejs';

// Always the same response whether or not a link was sent — prevents probing
// which emails are admins.
const GENERIC = {
  message: 'If that email is an authorized admin, a sign-in link has been sent.',
};

function baseUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, '');
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    console.error('ADMIN_SESSION_SECRET is not set');
    // Generic message even on misconfig — no signal to the client.
    return NextResponse.json(GENERIC);
  }

  let email = '';
  let nextRaw = '';
  try {
    const body = await request.json();
    email = String(body?.email ?? '').trim().toLowerCase();
    nextRaw = String(body?.next ?? '');
  } catch {
    return NextResponse.json(GENERIC);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(GENERIC);
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (!allowAdminLinkRequest(ip, email)) {
    return NextResponse.json(GENERIC);
  }

  // Authorization gate. Silent (generic response) on failure. Admins and staff
  // (by domain) may both request a link; page-level access is enforced later.
  if (isAllowedStaffOrAdmin(email)) {
    const token = await signAdminMagicLink(email, secret);
    const url = new URL('/admin/verify', baseUrl(request));
    url.searchParams.set('token', token);
    const next = safeNext(nextRaw);
    if (next) url.searchParams.set('next', next);
    await sendAdminMagicLinkEmail(email, url.toString());
  }

  return NextResponse.json(GENERIC);
}

// Same-origin admin path only, used as post-login redirect.
function safeNext(raw: string): string | null {
  if (raw.startsWith('/admin/') && raw !== '/admin/login') return raw;
  return null;
}
