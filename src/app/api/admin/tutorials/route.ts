import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tutorials = await prisma.tutorial.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  // Mark which tutorials have been published to the public Resources library
  // (a Resource with slug "tutorial-<id>" exists).
  const published = await prisma.resource
    .findMany({ where: { slug: { startsWith: 'tutorial-' } }, select: { slug: true } })
    .catch(() => [] as { slug: string }[]);
  const publishedIds = new Set(published.map((r) => Number(r.slug.slice('tutorial-'.length))));
  return NextResponse.json(tutorials.map((t) => ({ ...t, published: publishedIds.has(t.id) })));
}

// Records a saved tutorial after its video finished uploading to Blob.
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  const title = typeof b.title === 'string' ? b.title.trim() : '';
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'A valid video URL is required.' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'A description is required.' }, { status: 400 });
  const created = await prisma.tutorial.create({
    data: {
      title,
      description,
      url,
      contentType: typeof b.contentType === 'string' ? b.contentType : 'video/mp4',
      size: typeof b.size === 'number' ? Math.round(b.size) : 0,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.tutorial.delete({ where: { id } }).catch(() => {});
  // Also unpublish it from the public Resources page (removes the "tutorial-<id>"
  // resource if this tutorial was published).
  await prisma.resource.deleteMany({ where: { slug: `tutorial-${id}` } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
