// Stateless auth for the coordinator dashboard: compact HS256 JWTs signed
// with AUTH_JWT_SECRET. Two token purposes:
//   - "magic-link": short-lived (15 min) token embedded in the login email
//   - "session": 8h token stored in an httpOnly cookie
// No session table, no database writes — verification is signature + expiry
// only, and the verify route re-checks authorization against Postgres.
//
// Uses Web Crypto (like @/lib/auth/session) so it runs in edge middleware
// AND Node route handlers.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE_NAME = 'ibf_bfa_session';
export const MAGIC_LINK_TTL_SECONDS = 15 * 60;
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface MagicLinkClaims {
  purpose: 'magic-link';
  bc_user_id: number;
  user_id: number;
  school_id: number;
  exp: number;
}

export interface SessionClaims {
  purpose: 'session';
  user_id: number;
  school_id: number;
  exp: number;
}

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
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

const JWT_HEADER = toB64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));

async function signJwt(claims: Record<string, unknown>, secret: string): Promise<string> {
  const payload = toB64Url(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${JWT_HEADER}.${payload}`;
  const key = await importKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, source(encoder.encode(signingInput))));
  return `${signingInput}.${toB64Url(sig)}`;
}

async function verifyJwt(token: string | undefined, secret: string): Promise<Record<string, unknown> | null> {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const key = await importKey(secret);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    source(fromB64Url(sig)),
    source(encoder.encode(`${header}.${payload}`))
  );
  if (!valid) return null;
  try {
    const obj = JSON.parse(decoder.decode(fromB64Url(payload)));
    if (typeof obj.exp !== 'number' || obj.exp * 1000 < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export async function signMagicLinkToken(
  input: { bcUserId: number; userId: number; schoolId: number },
  secret: string
): Promise<string> {
  const claims: MagicLinkClaims = {
    purpose: 'magic-link',
    bc_user_id: input.bcUserId,
    user_id: input.userId,
    school_id: input.schoolId,
    exp: nowSeconds() + MAGIC_LINK_TTL_SECONDS,
  };
  return signJwt(claims as unknown as Record<string, unknown>, secret);
}

export async function verifyMagicLinkToken(
  token: string | undefined,
  secret: string
): Promise<MagicLinkClaims | null> {
  const obj = await verifyJwt(token, secret);
  if (!obj || obj.purpose !== 'magic-link') return null;
  if (typeof obj.bc_user_id !== 'number' || typeof obj.user_id !== 'number' || typeof obj.school_id !== 'number') {
    return null;
  }
  return obj as unknown as MagicLinkClaims;
}

export async function signSessionToken(
  input: { userId: number; schoolId: number },
  secret: string
): Promise<string> {
  const claims: SessionClaims = {
    purpose: 'session',
    user_id: input.userId,
    school_id: input.schoolId,
    exp: nowSeconds() + SESSION_TTL_SECONDS,
  };
  return signJwt(claims as unknown as Record<string, unknown>, secret);
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<SessionClaims | null> {
  const obj = await verifyJwt(token, secret);
  if (!obj || obj.purpose !== 'session') return null;
  if (typeof obj.user_id !== 'number' || typeof obj.school_id !== 'number') return null;
  return obj as unknown as SessionClaims;
}
