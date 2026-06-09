// HMAC-signed session tokens. Uses Web Crypto so this runs in edge middleware
// AND in Node route handlers. Token format: <base64url(payload)>.<base64url(hmac)>
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const COOKIE_NAME = 'ibf_admin';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export { COOKIE_NAME, DEFAULT_TTL_MS };

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

// Copy into a fresh ArrayBuffer so the value is a plain BufferSource for Web Crypto
// (avoids the Uint8Array<ArrayBufferLike> vs BufferSource type mismatch under strict TS).
function source(u: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(u.byteLength);
  new Uint8Array(out).set(u);
  return out;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(username: string, secret: string, ttlMs = DEFAULT_TTL_MS): Promise<string> {
  const payload = toB64Url(encoder.encode(JSON.stringify({ u: username, exp: Date.now() + ttlMs })));
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, source(encoder.encode(payload))));
  return `${payload}.${toB64Url(sig)}`;
}

// Returns the username if the token is valid and unexpired, otherwise null.
export async function verifySession(token: string | undefined, secret: string): Promise<string | null> {
  if (!token || !secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, source(fromB64Url(sig)), source(encoder.encode(payload)));
  if (!valid) return null;
  try {
    const obj = JSON.parse(decoder.decode(fromB64Url(payload)));
    if (typeof obj.exp !== 'number' || obj.exp < Date.now()) return null;
    return typeof obj.u === 'string' ? obj.u : null;
  } catch {
    return null;
  }
}
