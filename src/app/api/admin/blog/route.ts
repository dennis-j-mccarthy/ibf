import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { uniqueBlogSlug } from '@/lib/blog-admin';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const blogs = await prisma.blog.findMany({ orderBy: [{ createdAt: 'desc' }] });
  return NextResponse.json(blogs);
}

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const b = await request.json();
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  const slug = await uniqueBlogSlug(b.slug || title);

  const created = await prisma.blog.create({
    data: {
      title,
      slug,
      content: typeof b.content === 'string' ? b.content : '',
      summary: b.summary || null,
      thumbnail: b.thumbnail || null,
      category: b.category || null,
      color: b.color || null,
      embedHtml: b.embedHtml || null,
      featured: !!b.featured,
      archived: !!b.archived,
      starred: !!b.starred,
      publishedAt: b.published === false ? null : new Date(),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
