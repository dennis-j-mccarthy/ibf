import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Training document library: brand docs (design-language guides, angle decks)
// stored on Vercel Blob or linked by URL. Metadata lives in TrainingDocument.

const KINDS = new Set(['design-language', 'angles', 'other']);

export async function GET() {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const docs = await prisma.trainingDocument.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(docs);
}

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const url = typeof b?.url === 'string' ? b.url.trim() : '';
  const title = typeof b?.title === 'string' && b.title.trim() ? b.title.trim() : url.split('/').pop()?.split('?')[0] || 'Untitled';
  if (!url) return NextResponse.json({ error: 'URL required.' }, { status: 400 });
  const doc = await prisma.trainingDocument.create({
    data: {
      title,
      url,
      kind: KINDS.has(b?.kind) ? b.kind : 'other',
      contentType: typeof b?.contentType === 'string' ? b.contentType : '',
      size: Number.isFinite(b?.size) ? Math.max(0, Math.round(b.size)) : 0,
      source: b?.source === 'blob' ? 'blob' : 'url',
    },
  });
  return NextResponse.json(doc);
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const id = Number(b?.id);
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  const data: { title?: string; kind?: string } = {};
  if (typeof b?.title === 'string' && b.title.trim()) data.title = b.title.trim();
  if (KINDS.has(b?.kind)) data.kind = b.kind;
  const doc = await prisma.trainingDocument.update({ where: { id }, data });
  return NextResponse.json(doc);
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  await prisma.trainingDocument.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
