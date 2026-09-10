import { NextRequest, NextResponse } from 'next/server';
import { getSessionEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Comments on an audit message (staff and admins alike). Keyed by the
// message's stable group key so they survive re-runs of the audit.
export async function GET(request: NextRequest) {
  if (!(await getSessionEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const key = request.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  try {
    const comments = await prisma.emailAuditComment.findMany({
      where: { messageKey: key },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ comments });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2021') {
      return NextResponse.json({ comments: [], setup: 'db' });
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  const email = await getSessionEmail();
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const key = typeof body.key === 'string' ? body.key.trim() : '';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!key || !text) return NextResponse.json({ error: 'key and body required' }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: 'Comment too long' }, { status: 400 });

  const comment = await prisma.emailAuditComment.create({
    data: { messageKey: key, author: email, body: text },
  });
  return NextResponse.json({ ok: true, comment });
}
