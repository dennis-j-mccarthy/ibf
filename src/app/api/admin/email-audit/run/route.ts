import { NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';
import { marketingToken } from '@/lib/emailAudit/hubspot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Starts a new audit run. The run itself advances through repeated POSTs to
// ./step -- each one a short, serverless-sized slice -- driven by the page.
export async function POST() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!marketingToken()) {
    return NextResponse.json(
      { error: 'HUBSPOT_MARKETING_TOKEN is not set. Create a private app with only the content and automation scopes.' },
      { status: 400 },
    );
  }

  // A run abandoned mid-flight (closed tab, crashed step) would block new runs
  // forever. Steps touch updatedAt on every slice, so "running but untouched
  // for 10 minutes" means dead, without killing a long legitimate run.
  const stale = new Date(Date.now() - 10 * 60 * 1000);
  await prisma.emailAuditRun.updateMany({
    where: { status: 'running', updatedAt: { lt: stale } },
    data: { status: 'failed', error: 'abandoned' },
  });

  const active = await prisma.emailAuditRun.findFirst({ where: { status: 'running' } });
  if (active) {
    return NextResponse.json({ ok: true, runId: active.id, resumed: true });
  }

  const run = await prisma.emailAuditRun.create({ data: {} });
  return NextResponse.json({ ok: true, runId: run.id });
}
