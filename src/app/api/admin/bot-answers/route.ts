import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uniqueSlug, normalizeLinks, isSiteSection, isSiteVersion } from '@/lib/bot-knowledge';

// Auth is enforced by middleware.ts for the whole /api/admin/* prefix.

export async function GET() {
  const items = await prisma.botAnswer.findMany({
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';

  if (!question || !answer) {
    return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
  }

  const slug = await uniqueSlug(body.slug || question);

  const created = await prisma.botAnswer.create({
    data: {
      question,
      answer,
      slug,
      links: normalizeLinks(body.links),
      audience: typeof body.audience === 'string' ? body.audience : null,
      category: typeof body.category === 'string' ? body.category : null,
      order: typeof body.order === 'number' ? body.order : 0,
      isActive: body.isActive !== false,
      publishToSite: body.publishToSite === true,
      siteFeatured: body.siteFeatured === true,
      siteVersion: isSiteVersion(body.siteVersion) ? body.siteVersion : null,
      siteCategory: isSiteSection(body.siteCategory) ? body.siteCategory : null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
