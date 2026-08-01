import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Publishes a saved tutorial into the public Resources library as a "Tutorials"
// Video resource pointing at its Blob URL. The slug is derived from the tutorial
// id ("tutorial-<id>") so publishing is idempotent (upsert, no duplicates) and
// sync-resources.ts can preserve these across a wipe (it skips "tutorial-" slugs).
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const tutorial = await prisma.tutorial.findUnique({ where: { id } });
  if (!tutorial) return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });

  const slug = `tutorial-${id}`;
  const data = {
    title: tutorial.title,
    description: tutorial.description || null,
    fileUrl: tutorial.url,
    category: 'Tutorials',
    audience: 'Catholic In Person',
    resourceType: 'Video',
    // Pin to the top of the Tutorials section, newest first: the sort ties-break
    // on `order` ascending, so a higher id (newer) gets a lower value and leads.
    // Negative keeps these below every seeded tutorial (orders >= 38.8) too.
    order: -id,
    isActive: true,
  };
  await prisma.resource.upsert({ where: { slug }, update: data, create: { slug, ...data } });

  return NextResponse.json({ ok: true, slug, url: `/bookfair-resources?resource=${slug}` });
}

// Unpublish: remove the tutorial's public resource (the recording itself stays).
export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.resource.deleteMany({ where: { slug: `tutorial-${id}` } });
  return NextResponse.json({ ok: true });
}
