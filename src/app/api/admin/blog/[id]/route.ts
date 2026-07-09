import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { uniqueBlogSlug } from '@/lib/blog-admin';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const blogId = parseInt(id, 10);
  if (isNaN(blogId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const b = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof b.title === 'string') data.title = b.title.trim();
  if (typeof b.content === 'string') data.content = b.content;
  if (b.summary !== undefined) data.summary = b.summary || null;
  if (b.thumbnail !== undefined) data.thumbnail = b.thumbnail || null;
  if (b.category !== undefined) data.category = b.category || null;
  if (b.color !== undefined) data.color = b.color || null;
  if (b.embedHtml !== undefined) data.embedHtml = b.embedHtml || null;
  if (typeof b.featured === 'boolean') data.featured = b.featured;
  if (typeof b.archived === 'boolean') data.archived = b.archived;
  if (typeof b.starred === 'boolean') data.starred = b.starred;
  if (typeof b.published === 'boolean') {
    // Toggling publish: set/clear publishedAt, preserving an existing date when re-published.
    if (!b.published) {
      data.publishedAt = null;
    } else {
      const existing = await prisma.blog.findUnique({ where: { id: blogId }, select: { publishedAt: true } });
      data.publishedAt = existing?.publishedAt ?? new Date();
    }
  }
  if (typeof b.slug === 'string' && b.slug.trim()) {
    data.slug = await uniqueBlogSlug(b.slug, blogId);
  }

  try {
    const updated = await prisma.blog.update({ where: { id: blogId }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const blogId = parseInt(id, 10);
  if (isNaN(blogId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    // No FK relation to PromoKit — clean up its kit explicitly.
    await prisma.promoKit.deleteMany({ where: { blogId } });
    await prisma.blog.delete({ where: { id: blogId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
}
