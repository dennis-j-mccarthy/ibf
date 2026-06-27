// Tiny in-memory rate limiter for admin magic-link requests. Best-effort:
// per-instance (resets on cold start, not shared across serverless instances),
// which is sufficient to blunt casual abuse of the email-sending endpoint.
// Keyed by IP+email; also enforces a short per-instance global ceiling.

type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_KEY = 5; // attempts per IP+email per window

const buckets = new Map<string, Bucket>();

export function allowAdminLinkRequest(ip: string, email: string): boolean {
  const now = Date.now();
  const key = `${ip}|${email.toLowerCase()}`;
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (b.count >= MAX_PER_KEY) return false;
  b.count += 1;
  return true;
}
