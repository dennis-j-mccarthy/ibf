import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';
import { getTrainingImages, IMAGE_CATEGORIES } from '@/lib/training';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getTrainingImages());
}

// Records an image (either a pasted URL or a just-completed Blob upload).
export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  const url = typeof b.url === 'string' ? b.url.trim() : '';
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'A valid image URL is required.' }, { status: 400 });
  const category = IMAGE_CATEGORIES.includes(b.category) ? b.category : 'other';
  const created = await prisma.trainingImage.create({
    data: {
      url,
      alt: typeof b.alt === 'string' ? b.alt.trim() : '',
      category,
      audience: typeof b.audience === 'string' ? b.audience.trim() : '',
      tags: Array.isArray(b.tags) ? b.tags.map(String).map((s: string) => s.trim()).filter(Boolean) : [],
      source: b.source === 'blob' ? 'blob' : 'url',
    },
  });
  return NextResponse.json(created);
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json();
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (typeof b.alt === 'string') data.alt = b.alt.trim();
  if (IMAGE_CATEGORIES.includes(b.category)) data.category = b.category;
  if (typeof b.audience === 'string') data.audience = b.audience.trim();
  if (Array.isArray(b.tags)) data.tags = b.tags.map(String).map((s: string) => s.trim()).filter(Boolean);
  const updated = await prisma.trainingImage.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.trainingImage.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
