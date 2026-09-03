import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';
import { listEmailsPage, getEmailDetail, countFlows } from '@/lib/emailAudit/hubspot';
import { parseEmailContent } from '@/lib/emailAudit/content';
import { checkLink } from '@/lib/emailAudit/linkCheck';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Each step is one bounded slice of work; 60s comfortably covers the worst
// case (a details batch where every HubSpot call backs off once).
export const maxDuration = 60;

const DETAILS_PER_STEP = 10;
const DETAILS_CONCURRENCY = 2; // HubSpot: self-inflicted 429s above this
const LINKS_PER_STEP = 20;
const LINKS_CONCURRENCY = 4;

// Runs `worker` over `items` with at most `limit` in flight.
async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i]);
    }
  });
  await Promise.all(lanes);
}

// Advances the active run by one slice and reports progress. The page calls
// this in a loop until done. Phases: list -> details -> links -> done.
export async function POST() {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const run = await prisma.emailAuditRun.findFirst({
    where: { status: 'running' },
    orderBy: { startedAt: 'desc' },
  });
  if (!run) return NextResponse.json({ done: true, reason: 'no active run' });

  try {
    if (run.phase === 'list') {
      // First slice also counts flows -- one paginated pass, cheap.
      if (run.totalEmails === 0 && !run.cursor) {
        const flows = await countFlows();
        await prisma.emailAuditRun.update({
          where: { id: run.id },
          data: { flowsTotal: flows.total, flowsEnabled: flows.enabled },
        });
      }
      const { emails, nextAfter } = await listEmailsPage(run.cursor);
      if (emails.length) {
        await prisma.emailAuditEmail.createMany({
          data: emails.map((e) => ({
            runId: run.id,
            hubspotId: e.id,
            name: e.name,
            subject: e.subject,
          })),
          skipDuplicates: true,
        });
      }
      await prisma.emailAuditRun.update({
        where: { id: run.id },
        data: {
          cursor: nextAfter,
          totalEmails: { increment: emails.length },
          ...(nextAfter ? {} : { phase: 'details' }),
        },
      });
    } else if (run.phase === 'details') {
      // Unprocessed rows are the ones whose blocks are still database NULL.
      // (`equals: undefined` would silently drop the filter and loop forever.)
      const batch = await prisma.emailAuditEmail.findMany({
        where: { runId: run.id, blocks: { equals: Prisma.DbNull } },
        take: DETAILS_PER_STEP,
        select: { id: true, hubspotId: true },
      });
      if (batch.length === 0) {
        // All details parsed -- seed the link table and move on.
        const emails = await prisma.emailAuditEmail.findMany({
          where: { runId: run.id },
          select: { links: true },
        });
        const urls = new Set<string>();
        for (const e of emails) {
          for (const l of (e.links as { url: string }[] | null) ?? []) urls.add(l.url);
        }
        if (urls.size) {
          await prisma.emailAuditLink.createMany({
            data: [...urls].map((url) => ({ runId: run.id, url, status: 'pending' })),
            skipDuplicates: true,
          });
        }
        await prisma.emailAuditRun.update({
          where: { id: run.id },
          data: { phase: 'links', totalLinks: urls.size },
        });
      } else {
        await pool(batch, DETAILS_CONCURRENCY, async (row) => {
          const detail = await getEmailDetail(row.hubspotId);
          const { blocks, links } = parseEmailContent(detail);
          await prisma.emailAuditEmail.update({
            where: { id: row.id },
            data: { blocks, links },
          });
        });
        await prisma.emailAuditRun.update({
          where: { id: run.id },
          data: { detailsFetched: { increment: batch.length } },
        });
      }
    } else if (run.phase === 'links') {
      const batch = await prisma.emailAuditLink.findMany({
        where: { runId: run.id, status: 'pending' },
        take: LINKS_PER_STEP,
      });
      if (batch.length === 0) {
        await prisma.emailAuditRun.update({
          where: { id: run.id },
          data: { phase: 'done', status: 'complete', finishedAt: new Date() },
        });
      } else {
        await pool(batch, LINKS_CONCURRENCY, async (row) => {
          const verdict = await checkLink(row.url);
          await prisma.emailAuditLink.update({
            where: { id: row.id },
            data: {
              status: verdict.status,
              httpStatus: verdict.httpStatus,
              finalUrl: verdict.finalUrl,
            },
          });
        });
        await prisma.emailAuditRun.update({
          where: { id: run.id },
          data: { checkedLinks: { increment: batch.length } },
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : 'step failed';
    await prisma.emailAuditRun.update({
      where: { id: run.id },
      data: { status: 'failed', error: message },
    });
    return NextResponse.json({ done: true, failed: true, error: message });
  }

  const after = await prisma.emailAuditRun.findUnique({ where: { id: run.id } });
  return NextResponse.json({
    done: after?.status !== 'running',
    failed: after?.status === 'failed',
    phase: after?.phase,
    totalEmails: after?.totalEmails ?? 0,
    detailsFetched: after?.detailsFetched ?? 0,
    totalLinks: after?.totalLinks ?? 0,
    checkedLinks: after?.checkedLinks ?? 0,
  });
}
