import { NextRequest, NextResponse } from 'next/server';
import { getAdminEmail } from '@/lib/auth/admin-guard';
import { prisma } from '@/lib/prisma';
import { groupEmails, JOURNEY_SECTIONS, type AuditEmailRow } from '@/lib/emailAudit/grouping';
import { marketingToken } from '@/lib/emailAudit/hubspot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Read side of the email audit. Serves only cached data -- HubSpot is never
// called here. ?email=<hubspotId> additionally returns that email's rendered
// blocks for the preview modal (they are too heavy for the list payload).
export async function GET(request: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [latestComplete, active] = await Promise.all([
      prisma.emailAuditRun.findFirst({
        where: { status: 'complete' },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.emailAuditRun.findFirst({
        where: { status: 'running' },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    const emailId = request.nextUrl.searchParams.get('email');
    if (emailId && latestComplete) {
      const email = await prisma.emailAuditEmail.findUnique({
        where: { runId_hubspotId: { runId: latestComplete.id, hubspotId: emailId } },
      });
      if (!email) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ blocks: email.blocks ?? [] });
    }

    let view = null;
    if (latestComplete) {
      const [emails, links] = await Promise.all([
        // blocks are needed here only for the rep-variant hash; the grouped
        // response never includes them (the modal fetches ?email= lazily).
        prisma.emailAuditEmail.findMany({
          where: { runId: latestComplete.id },
          select: { hubspotId: true, name: true, subject: true, links: true, blocks: true },
        }),
        prisma.emailAuditLink.findMany({ where: { runId: latestComplete.id } }),
      ]);

      const linkStatus = new Map(links.map((l) => [l.url, l]));
      const rows: AuditEmailRow[] = emails.map((e) => ({
        hubspotId: e.hubspotId,
        name: e.name,
        subject: e.subject,
        blocks: e.blocks,
        links: (e.links as AuditEmailRow['links']) ?? [],
      }));

      const { sequenced, other } = groupEmails(rows);

      const decorate = (g: (typeof sequenced)[number]) => ({
        ...g,
        links: g.links.map((l) => ({
          ...l,
          status: linkStatus.get(l.url)?.status ?? 'unchecked',
          httpStatus: linkStatus.get(l.url)?.httpStatus ?? null,
        })),
      });

      const sections = JOURNEY_SECTIONS.map((s) => ({
        title: s.title,
        messages: sequenced.filter((g) => g.phase && s.phases.includes(g.phase)).map(decorate),
      })).filter((s) => s.messages.length > 0);

      const unmatchedSequenced = sequenced
        .filter((g) => !JOURNEY_SECTIONS.some((s) => g.phase && s.phases.includes(g.phase)))
        .map(decorate);

      view = {
        runAt: latestComplete.startedAt,
        finishedAt: latestComplete.finishedAt,
        totals: {
          emails: latestComplete.totalEmails,
          flows: latestComplete.flowsTotal,
          flowsEnabled: latestComplete.flowsEnabled,
          sequenceEmails: rows.length - other.length,
          distinctMessages: sequenced.length,
          repDuplicated: sequenced.filter((g) => g.copies.length > 1).length,
          brokenLinks: links.filter((l) => l.status === 'broken').length,
        },
        sections,
        unmatchedSequenced,
        other: other.map(decorate),
      };
    }

    return NextResponse.json({
      tokenConfigured: Boolean(marketingToken()),
      active: active
        ? {
            id: active.id,
            phase: active.phase,
            totalEmails: active.totalEmails,
            detailsFetched: active.detailsFetched,
            totalLinks: active.totalLinks,
            checkedLinks: active.checkedLinks,
            startedAt: active.startedAt,
          }
        : null,
      view,
    });
  } catch (err) {
    // P2021: the audit tables are not in the database yet (prisma db push
    // pending). Surface that as a setup state, not a 500.
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2021') {
      return NextResponse.json({ tokenConfigured: Boolean(marketingToken()), setup: 'db' });
    }
    throw err;
  }
}
