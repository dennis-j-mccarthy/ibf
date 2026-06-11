// Server-side session access for the coordinator dashboard (Node only —
// uses next/headers). Middleware already gates the routes; these helpers are
// defense-in-depth and the source of the session's school_id for queries.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionClaims } from './auth';

export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  return verifySessionToken(
    store.get(SESSION_COOKIE_NAME)?.value,
    process.env.AUTH_JWT_SECRET ?? ''
  );
}

export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) redirect('/book-fair-admin/login');
  return session;
}
