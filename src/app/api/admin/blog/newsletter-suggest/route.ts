import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { suggestNewsletter } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 });
  }

  const body = await request.json();
  const kind = body.kind;
  if (kind !== 'title' && kind !== 'subject' && kind !== 'preamble') {
    return NextResponse.json({ error: 'Invalid kind' }, { status: 400 });
  }
  const timeframe = typeof body.timeframe === 'string' ? body.timeframe : '';

  // Authoritative article set: the currently-starred (queued) posts.
  const starred = await prisma.blog.findMany({
    where: { starred: true },
    select: { title: true, summary: true, category: true },
    orderBy: { publishedAt: 'desc' },
  });
  if (starred.length === 0) {
    return NextResponse.json({ error: 'No posts are queued for the newsletter.' }, { status: 400 });
  }

  try {
    const result = await suggestNewsletter({
      kind,
      timeframe,
      articles: starred.map((b) => ({
        title: b.title,
        summary: b.summary ?? '',
        category: b.category ?? '',
      })),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Newsletter suggest failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Suggestion failed' },
      { status: 502 }
    );
  }
}
