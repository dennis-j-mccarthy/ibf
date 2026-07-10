import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { uniqueBlogSlug } from '@/lib/blog-admin';
import { generateArticle } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60; // article generation can take a while

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 });
  }

  const body = await request.json();
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic) {
    return NextResponse.json({ error: 'A topic is required' }, { status: 400 });
  }

  const audience = typeof body.audience === 'string' && body.audience.trim() ? body.audience.trim() : undefined;
  const bullets = Array.isArray(body.bullets)
    ? body.bullets.filter((b: unknown): b is string => typeof b === 'string' && b.trim() !== '').slice(0, 5)
    : undefined;
  const thumbnail = typeof body.thumbnail === 'string' && body.thumbnail.trim() ? body.thumbnail.trim() : null;

  let article;
  try {
    article = await generateArticle({ topic, category: body.category || undefined, audience, bullets });
  } catch (error) {
    console.error('Article generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 502 }
    );
  }

  const slug = await uniqueBlogSlug(article.title);
  const created = await prisma.blog.create({
    data: {
      title: article.title,
      slug,
      content: article.contentHtml,
      summary: article.summary,
      category: article.category || body.category || null,
      thumbnail,
      publishedAt: null, // created as a draft for review before publishing
    },
  });
  return NextResponse.json(created, { status: 201 });
}
