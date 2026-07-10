import { NextResponse, type NextRequest } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedAdminEmail } from '@/lib/auth/admin-allowlist';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/book-fair-admin/auth';

// Public endpoints inside the protected prefixes.
const PUBLIC_PATHS = new Set([
  '/admin/login',
  '/admin/verify',
  '/api/admin/login',
  '/api/admin/logout',
  '/api/admin/magic-link/request',
]);
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

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated. Any /admin route not on this deny-list is open to every
  // staff-domain session. When adding a NEW admin-only area, add its path
  // prefix here (page and API) — otherwise it defaults to staff-accessible.
  // The bot-knowledge CMS and the blog CMS are admin-only; staff sign in only
  // for /admin/fairs.
  const isAdminOnly =
    pathname.startsWith('/admin/bot-knowledge') ||
    pathname.startsWith('/api/admin/bot-answers') ||
    pathname.startsWith('/admin/blog') ||
    pathname.startsWith('/api/admin/blog');
  if (isAdminOnly && !isAllowedAdminEmail(user)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/fairs';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // /admin renders the admin dashboard for full admins; staff-only sessions go
  // straight to their one tool (the Upcoming Fairs list).
  if (pathname === '/admin' && !isAllowedAdminEmail(user)) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/fairs';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/book-fair-admin/:path*',
    '/api/book-fair-admin/:path*',
  ],
};
