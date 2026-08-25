import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Shared-password gate for /health. Not authentication -- everyone uses the
 * same password, so treat the page as public-with-friction: fine for a status
 * board, never for anything sensitive.
 *
 * The cookie holds an HMAC of the password rather than the password (or a bare
 * "1"), so it can't be forged by anyone who simply guesses the cookie name.
 */
export const HEALTH_COOKIE = 'health_access';

function password(): string {
  return process.env.HEALTH_PAGE_PASSWORD || 'health-o-meter';
}

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_JWT_SECRET || 'health-page-fallback';
}

export function accessToken(): string {
  return createHmac('sha256', secret()).update(password()).digest('hex');
}

export function checkPassword(input: string): boolean {
  const a = Buffer.from((input || '').trim());
  const b = Buffer.from(password());
  // Compare lengths first -- timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isUnlocked(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(accessToken());
  return a.length === b.length && timingSafeEqual(a, b);
}
