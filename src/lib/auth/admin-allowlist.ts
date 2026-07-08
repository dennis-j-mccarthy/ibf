// Who may sign in to /admin via magic link.
//
// Admin accounts are passwordless: anyone on this allowlist can request a
// sign-in link to their email. Edit the built-in list here, or extend it
// without a deploy via the ADMIN_MAGIC_LINK_EMAILS env var (comma-separated).
// Matching is case-insensitive and exact (full email, not domain) so /admin
// stays tightly scoped — it is NOT the same as the broader staff domains that
// gate the Upcoming Fairs calendar.

const BUILTIN_ADMIN_EMAILS = [
  'dennis.mccarthy@avemaria.edu',
];

export function allowedAdminEmails(): Set<string> {
  const fromEnv = (process.env.ADMIN_MAGIC_LINK_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...BUILTIN_ADMIN_EMAILS.map((s) => s.toLowerCase()), ...fromEnv]);
}

export function isAllowedAdminEmail(email: string): boolean {
  return allowedAdminEmails().has(email.trim().toLowerCase());
}

// Broader "staff" gate for the Upcoming Fairs list (/admin/fairs). Anyone at an
// Ignatius/Ave Maria staff domain counts as staff — deliberately wider than the
// exact-email admin allowlist above, which stays scoped to the bot-knowledge CMS.
const STAFF_EMAIL_DOMAINS = ['avemaria.edu', 'ignatiusbookclub.com'];

export function isStaffEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at === -1) return false;
  return STAFF_EMAIL_DOMAINS.includes(normalized.slice(at + 1));
}

// May request a sign-in link / hold a session at all (admins are a subset of staff).
export function isAllowedStaffOrAdmin(email: string): boolean {
  return isAllowedAdminEmail(email) || isStaffEmail(email);
}
