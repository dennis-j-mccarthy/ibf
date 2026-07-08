// Staff fair-detail popup: on click, fetch a single fair's Deal + Company fields
// from HubSpot (on demand — the list never bulk-loads companies). Middleware
// gates /api/admin/* to authenticated staff/admins.
import { NextRequest, NextResponse } from 'next/server';
import { getFairDetailRefs } from '@/lib/book-fair-admin/queries';
import { getDeal, getCompany } from '@/lib/book-fair-admin/hubspot';

export const runtime = 'nodejs';

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ') || null;

export async function GET(request: NextRequest) {
  const fairId = Number(request.nextUrl.searchParams.get('fairId'));
  if (!Number.isInteger(fairId) || fairId <= 0) {
    return NextResponse.json({ error: 'Invalid fairId' }, { status: 400 });
  }

  const refs = await getFairDetailRefs(fairId);
  if (!refs) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [deal, company] = await Promise.all([
    refs.hsDealId ? getDeal(refs.hsDealId) : Promise.resolve(null),
    refs.hsCompanyId ? getCompany(refs.hsCompanyId) : Promise.resolve(null),
  ]);
  const dp = deal?.properties ?? {};
  const cp = company?.properties ?? {};

  return NextResponse.json({
    identifier: dp.account_number ?? null,
    companyName: cp.name ?? refs.schoolName ?? null,
    street: cp.address ?? refs.street ?? null,
    city: cp.city ?? refs.city ?? null,
    state: cp.state ?? refs.state ?? null,
    fairType: dp.fair_type ?? dp.dealtype ?? null,
    studentsEnrolled: dp.students_enrolled ?? null,
    gradeLevels: cp.grade_levels ?? null,
    aveAdminName: join(dp.ave_dollars_first_name, dp.ave_dollars_last_name),
    aveAdminEmail: dp.ave_dollar_email ?? null,
    organizerName: join(dp.chair_organizer_first_name, dp.chair_organizer_last_name),
    organizerEmail: dp.chair_organizer_email ?? null,
    hubspotUnavailable: !!refs.hsDealId && !deal,
  });
}
