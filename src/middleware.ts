import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/book-fair-admin/auth';

// Public endpoints inside the protected prefixes.
const PUBLIC_PATHS = new Set(['/admin/login', '/api/admin/login', '/api/admin/logout']);
const BOOK_FAIR_PUBLIC_PATHS = new Set(['/book-fair-admin/login', '/book-fair-admin/verify']);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Coordinator dashboard (magic-link sessions, AUTH_JWT_SECRET).
  if (pathname.startsWith('/book-fair-admin') || pathname.startsWith('/api/book-fair-admin')) {
    if (BOOK_FAIR_PUBLIC_PATHS.has(pathname)) return NextResponse.next();

    const session = await verifySessionToken(
      req.cookies.get(SESSION_COOKIE_NAME)?.value,
      process.env.AUTH_JWT_SECRET ?? ''
    );
    if (session) return NextResponse.next();

    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/book-fair-admin/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Site admin (username/password sessions, ADMIN_SESSION_SECRET).
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const user = await verifySession(
    req.cookies.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );

  if (user) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/book-fair-admin/:path*',
    '/api/book-fair-admin/:path*',
  ],
};
