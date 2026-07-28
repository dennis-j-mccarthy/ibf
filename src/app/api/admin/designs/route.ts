import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Saved Header/Sign Maker designs — the full editor state, so any saved item
// can be reloaded, duplicated, and tweaked.

const TOOLS = new Set(['header', 'sign']);

export async function GET(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tool = request.nextUrl.searchParams.get('tool');
  const rows = await prisma.savedDesign.findMany({
    where: TOOLS.has(tool || '') ? { tool: tool! } : undefined,
    orderBy: { createdAt: 'desc' },
  }).catch(() => []);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  if (!TOOLS.has(b?.tool)) return NextResponse.json({ error: 'tool must be header or sign.' }, { status: 400 });
  if (!b?.params || typeof b.params !== 'object') return NextResponse.json({ error: 'params required.' }, { status: 400 });
  const row = await prisma.savedDesign.create({
    data: { tool: b.tool, name: typeof b.name === 'string' ? b.name.slice(0, 120) : '', params: b.params },
  });
  return NextResponse.json(row);
}

export async function PATCH(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => null);
  const id = Number(b?.id);
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  const data: { name?: string; params?: object } = {};
  if (typeof b?.name === 'string') data.name = b.name.slice(0, 120);
  if (b?.params && typeof b.params === 'object') data.params = b.params;
  const row = await prisma.savedDesign.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(request: NextRequest) {
  if (!(await getAdminEmail())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = Number(request.nextUrl.searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 });
  await prisma.savedDesign.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
