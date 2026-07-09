import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminEmail } from '@/lib/auth/admin-guard';

export const runtime = 'nodejs';

// "The newsletter went out": unstar every queued post and stamp it as featured.
export async function POST() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await prisma.blog.updateMany({
    where: { starred: true },
    data: { starred: false, newsletteredAt: new Date() },
  });
  return NextResponse.json({ ok: true, count: result.count });
}
