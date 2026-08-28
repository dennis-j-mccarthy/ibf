// Client-side check for "does this browser hold a real admin session?".
//
// This gates the on-site edit/tagging UI only. It is deliberately NOT the
// security boundary: /api/faqs/[id] and /api/blogs/[id] verify the signed
// session cookie server-side, so a user who fakes this check still cannot
// write anything. It replaces a hardcoded username/password pair that lived
// in client components.
export async function isAdminSession(): Promise<boolean> {
  try {
    const r = await fetch('/api/admin/me', { cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  }
}
