// Passwordless admin sign-in: short-lived HMAC-signed magic-link tokens.
//
// Self-contained (Web Crypto only, no book-fair-admin imports) so it runs in
// edge middleware AND Node route handlers, and can ship to `main` where the
// coordinator dashboard code does not exist.
//
// The magic-link token is cryptographically domain-separated from the admin
// SESSION token (lib/auth/session.ts): it is signed with `${secret}:admin-magic`
// and carries an `{ e, exp }` shape (no `u` field), so a leaked link can never
// be replayed as a session cookie and vice-versa.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  let str = s.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function source(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  // Domain separation: never the bare session secret.
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`${secret}:admin-magic`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Sign a magic-link token for `email`. Caller emails the resulting token.
export async function signAdminMagicLink(
  email: string,
  secret: string,
  ttlMs = MAGIC_LINK_TTL_MS
): Promise<string> {
  const payload = toB64Url(
    encoder.encode(JSON.stringify({ e: email.toLowerCase(), exp: Date.now() + ttlMs }))
  );
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, source(encoder.encode(payload))));
  return `${payload}.${toB64Url(sig)}`;
}

// Returns the lowercased email if the token is valid and unexpired, else null.
export async function verifyAdminMagicLink(
  token: string | undefined,
  secret: string
): Promise<string | null> {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      source(fromB64Url(sig)),
      source(encoder.encode(payload))
    );
    if (!valid) return null;
    const obj = JSON.parse(decoder.decode(fromB64Url(payload)));
    if (typeof obj.exp !== 'number' || obj.exp < Date.now()) return null;
    return typeof obj.e === 'string' ? obj.e : null;
  } catch {
    // Malformed base64 / decode errors → treat as an invalid link.
    return null;
  }
}
