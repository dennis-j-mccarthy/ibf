import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Saved Social Studio posts, grouped under their parent concept (blog title or
// campaign name) so they resurface whenever that concept is opened again.

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export async function GET(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const concept = request.nextUrl.searchParams.get('concept');
  const posts = await prisma.savedSocialPost.findMany({
    where: concept ? { conceptSlug: slugify(concept) } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const concept = typeof b?.concept === 'string' ? b.concept.trim() : '';
  if (!concept) return NextResponse.json({ error: 'concept required.' }, { status: 400 });
  if (!b?.post || typeof b.post !== 'object') return NextResponse.json({ error: 'post required.' }, { status: 400 });
  const saved = await prisma.savedSocialPost.create({
    data: { concept, conceptSlug: slugify(concept), post: b.post },
  });
  return NextResponse.json(saved);
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  await prisma.savedSocialPost.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
