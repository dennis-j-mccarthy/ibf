import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { generatePromoKit, htmlToText, type PromoKit } from '@/lib/claude';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SITE = 'https://www.ignatiusbookfairs.com';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const blogId = parseInt(id, 10);
  if (isNaN(blogId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const kit = await prisma.promoKit.findUnique({ where: { blogId } });
  return NextResponse.json({ content: kit ? (JSON.parse(kit.content) as PromoKit) : null });
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 503 });
  }
  const { id } = await params;
  const blogId = parseInt(id, 10);
  if (isNaN(blogId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const post = await prisma.blog.findUnique({ where: { id: blogId } });
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  let content: PromoKit;
  try {
    content = await generatePromoKit({
      title: post.title,
      summary: post.summary ?? '',
      category: post.category ?? 'General',
      articleText: htmlToText(post.content),
      url: `${SITE}/blog/${post.slug}`,
    });
  } catch (error) {
    console.error('Promo generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 502 }
    );
  }

  await prisma.promoKit.upsert({
    where: { blogId },
    create: { blogId, content: JSON.stringify(content) },
    update: { content: JSON.stringify(content) },
  });
  return NextResponse.json({ content });
}
