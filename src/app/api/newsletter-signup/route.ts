import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Public endpoint for the newsletter slide-in. Same abuse posture as
// SpecComment: a honeypot field plus a light per-IP hourly cap.
const seen = new Map<string, { count: number; reset: number }>();
function overLimit(ip: string): boolean {
  const now = Date.now();
  const slot = seen.get(ip);
  if (!slot || now > slot.reset) {
    seen.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return false;
  }
  slot.count += 1;
  return slot.count > 20;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  // Honeypot: real users never fill this hidden field.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (overLimit(ip)) {
    return NextResponse.json({ error: 'Too many attempts; try again later.' }, { status: 429 });
  }

  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : 'popup';
  const path = typeof body.path === 'string' ? body.path.slice(0, 200) : '';

  try {
    await prisma.newsletterSignup.upsert({
      where: { email },
      update: {}, // already subscribed -- treat as success, no churn
      create: { email, source, path },
    });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2021') {
      return NextResponse.json({ error: 'Signups are temporarily unavailable.' }, { status: 503 });
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
