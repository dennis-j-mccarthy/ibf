import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uniqueSlug, normalizeLinks } from '@/lib/bot-knowledge';

// Auth is enforced by middleware.ts for the whole /api/admin/* prefix.

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const answerId = parseInt(id, 10);
  if (isNaN(answerId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (typeof body.question === 'string') data.question = body.question.trim();
  if (typeof body.answer === 'string') data.answer = body.answer.trim();
  if (body.links !== undefined) data.links = normalizeLinks(body.links);
  if (body.audience !== undefined) data.audience = body.audience || null;
  if (body.category !== undefined) data.category = body.category || null;
  if (typeof body.order === 'number') data.order = body.order;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  // Recompute the slug only when explicitly provided, keeping it unique.
  if (typeof body.slug === 'string' && body.slug.trim()) {
    data.slug = await uniqueSlug(body.slug, answerId);
  }

  try {
    const updated = await prisma.botAnswer.update({ where: { id: answerId }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const answerId = parseInt(id, 10);
  if (isNaN(answerId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    await prisma.botAnswer.delete({ where: { id: answerId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Answer not found' }, { status: 404 });
  }
}
