import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { HEALTH_COOKIE, isUnlocked } from '@/lib/health/access';
import { ITEMS, STAKEHOLDERS } from '@/lib/health/data';

const MAX_NAME = 80;
const MAX_BODY = 2000;
// Counted from the table, not memory: each serverless invocation is a fresh
// process, so an in-memory counter would never actually limit anything.
const MAX_PER_HOUR = 10;

export async function GET() {
  if (!isUnlocked((await cookies()).get(HEALTH_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Locked' }, { status: 401 });
  }
  try {
    const comments = await prisma.healthComment.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching health comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isUnlocked((await cookies()).get(HEALTH_COOKIE)?.value)) {
    return NextResponse.json({ error: 'Locked' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const project = str(payload.project) || 'general';
  const itemId = str(payload.itemId);
  const stakeholderName = str(payload.stakeholderName);
  const body = str(payload.body);

  // Bots fill every field they find; a human never sees this one.
  if (str(payload.website)) {
    return NextResponse.json({ error: 'Rejected' }, { status: 400 });
  }
  if (!['lead', 'store', 'general'].includes(project)) {
    return NextResponse.json({ error: 'Unknown project' }, { status: 400 });
  }
  // "" is the general board thread; anything else must be a real item.
  if (itemId && !ITEMS.some((i) => i.id === itemId)) {
    return NextResponse.json({ error: 'Unknown item' }, { status: 400 });
  }
  // Checked here, not just in the dropdown: one shared password means anyone
  // with the link could otherwise post under any name they invented.
  if (!(STAKEHOLDERS as readonly string[]).includes(stakeholderName)) {
    return NextResponse.json({ error: 'Pick your name from the list' }, { status: 400 });
  }
  if (stakeholderName.length > MAX_NAME) {
    return NextResponse.json({ error: 'Name too long' }, { status: 400 });
  }
  if (!body || body.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Comment is required and must be ${MAX_BODY} characters or fewer` },
      { status: 400 },
    );
  }

  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.healthComment.count({
      where: { stakeholderName, createdAt: { gte: since } },
    });
    if (recent >= MAX_PER_HOUR) {
      return NextResponse.json(
        { error: `Too many comments. Limit is ${MAX_PER_HOUR} per hour.` },
        { status: 429 },
      );
    }

    const comment = await prisma.healthComment.create({
      data: { project, itemId, stakeholderName, body },
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating health comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
