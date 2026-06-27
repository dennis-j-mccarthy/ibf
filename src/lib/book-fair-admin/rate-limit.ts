// Simple in-memory fixed-window rate limiter for the magic-link login action.
// No database — per the read-only constraint. On serverless each instance has
// its own window, which is acceptable for abuse-dampening on a login form
// (the generic response already prevents email enumeration).

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL_IP = 5; // requests per (ip,email) per window
const MAX_PER_IP = 20; // requests per ip per window

function hit(key: string, max: number): boolean {
  const now = Date.now();
  const win = buckets.get(key);
  if (!win || win.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  win.count += 1;
  return win.count <= max;
}

export function allowLoginAttempt(ip: string, email: string): boolean {
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (buckets.size > 10_000) {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }
  const ipOk = hit(`ip:${ip}`, MAX_PER_IP);
  const pairOk = hit(`pair:${ip}:${email.toLowerCase()}`, MAX_PER_EMAIL_IP);
  return ipOk && pairOk;
}
