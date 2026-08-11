import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { getTemplates } from '@/lib/templates/store';
import { TEMPLATE_KINDS } from '@/lib/templates/defaults';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The studio reads the merged library (built-in defaults + admin rows) and
// writes only rows. Saving a built-in for the first time creates the row that
// shadows it; "Reset to default" deletes the row.

const KINDS = new Set(TEMPLATE_KINDS.map((k) => k.key as string));

export async function GET() {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getTemplates());
}

export async function PUT(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const slug = typeof b?.slug === 'string' ? b.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') : '';
  if (!slug) return NextResponse.json({ error: 'slug required.' }, { status: 400 });
  if (!KINDS.has(b?.kind)) return NextResponse.json({ error: 'unknown template kind.' }, { status: 400 });

  const data = {
    kind: b.kind as string,
    name: String(b.name ?? '').slice(0, 160),
    description: String(b.description ?? '').slice(0, 400),
    audience: String(b.audience ?? ''),
    subject: String(b.subject ?? '').slice(0, 400),
    body: String(b.body ?? ''),
    heroImage: String(b.heroImage ?? '').slice(0, 300),
    heroScript: String(b.heroScript ?? '').slice(0, 60),
    footerImage: String(b.footerImage ?? '').slice(0, 300),
    order: Number.isFinite(Number(b.order)) ? Number(b.order) : 0,
    isActive: b.isActive !== false,
  };

  const row = await prisma.template.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  return NextResponse.json(row);
}

// Removes the admin row. A built-in template reverts to its shipped default;
// an admin-authored one disappears.
export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required.' }, { status: 400 });
  await prisma.template.delete({ where: { slug } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
