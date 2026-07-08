import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedAdminEmail } from '@/lib/auth/admin-allowlist';

// /admin has no page of its own -- full admins get the bot-knowledge CMS,
// staff-only users get the Upcoming Fairs list. (Middleware guarantees a
// valid session before this renders.)
export default async function AdminIndex() {
  const store = await cookies();
  const email = await verifySession(
    store.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );
  redirect(email && isAllowedAdminEmail(email) ? '/admin/bot-knowledge' : '/admin/fairs');
}
