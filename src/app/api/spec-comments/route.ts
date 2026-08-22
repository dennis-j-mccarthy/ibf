import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const DEFAULT_DOC_SLUG = 'gift-wallet-spec';
const MAX_AUTHOR_NAME = 80;
const MAX_BODY = 2000;
// Per-author cap. Checked against the table rather than memory: on Vercel each
// invocation is a fresh process, so in-memory counters reset constantly and
// would never actually limit anything.
const MAX_PER_HOUR = 10;

export async function GET(request: NextRequest) {
  const docSlug = request.nextUrl.searchParams.get('docSlug') || DEFAULT_DOC_SLUG;

  try {
    const comments = await prisma.specComment.findMany({
      where: { docSlug },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching spec comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const docSlug = str(payload.docSlug) || DEFAULT_DOC_SLUG;
  const section = str(payload.section);
  const authorName = str(payload.authorName);
  const body = str(payload.body);
  const honeypot = str(payload.website);

  // Bots fill every field they find. A human never sees this one.
  if (honeypot) {
    return NextResponse.json({ error: 'Rejected' }, { status: 400 });
  }
  if (!section) {
    return NextResponse.json({ error: 'Section is required' }, { status: 400 });
  }
  if (!authorName || authorName.length > MAX_AUTHOR_NAME) {
    return NextResponse.json(
      { error: `Name is required and must be ${MAX_AUTHOR_NAME} characters or fewer` },
      { status: 400 }
    );
  }
  if (!body || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Comment is required and must be ${MAX_BODY} characters or fewer` },
      { status: 400 }
    );
  }

  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.specComment.count({
      where: { authorName, createdAt: { gte: since } },
    });
    // >= so the author can never end up holding more than MAX_PER_HOUR rows.
    if (recent >= MAX_PER_HOUR) {
      return NextResponse.json(
        { error: `Too many comments. Limit is ${MAX_PER_HOUR} per hour.` },
        { status: 429 }
      );
    }

    const comment = await prisma.specComment.create({
      data: { docSlug, section, authorName, body },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating spec comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
