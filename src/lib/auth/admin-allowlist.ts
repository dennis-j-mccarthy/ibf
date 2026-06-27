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
