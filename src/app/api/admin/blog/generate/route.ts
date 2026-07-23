import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { uniqueBlogSlug } from '@/lib/blog-admin';
import { generateArticle } from '@/lib/claude';
import { fetchBooks } from '@/lib/books';
import { getSavedTrainingProfile, brandBrief, getTrainingDocuments } from '@/lib/training';

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

  // Up to 5 shop.ignatiusbookfairs.com book URLs to feature (title/cover/link from the page).
  const bookUrls = Array.isArray(body.bookUrls)
    ? body.bookUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim() !== '').slice(0, 5)
    : [];
  const books = bookUrls.length ? await fetchBooks(bookUrls) : [];

  const savedProfile = await getSavedTrainingProfile();
  const docs = await getTrainingDocuments();
  const brief = savedProfile ? brandBrief(savedProfile, { forAudience: audience, docs }) : '';

  let article;
  try {
    article = await generateArticle({ topic, category: body.category || undefined, audience, bullets, books, brandBrief: brief });
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
      featuredBooks: books.length ? books : undefined,
      publishedAt: null, // created as a draft for review before publishing
    },
  });
  return NextResponse.json(created, { status: 201 });
}
