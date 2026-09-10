import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedAdminEmail } from '@/lib/auth/admin-allowlist';

// Returns the signed-in admin's email if the request carries a valid,
// allowlisted-admin session; otherwise null. Used to gate the blog/promo/
// newsletter admin as ADMIN-ONLY, independent of (and defensive over)
// middleware — and merge-safe if staff-domain login is added elsewhere.
export async function getAdminEmail(): Promise<string | null> {
  const store = await cookies();
  const email = await verifySession(
    store.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );
  return email && isAllowedAdminEmail(email) ? email : null;
}

// Returns the signed-in email for ANY valid session (staff or admin). For
// tools the middleware exposes to the whole staff domain -- the email audit,
// bot knowledge -- where attribution matters but allowlisting does not.
export async function getSessionEmail(): Promise<string | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value, process.env.ADMIN_SESSION_SECRET ?? '');
}
