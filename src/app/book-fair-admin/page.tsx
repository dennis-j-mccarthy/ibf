import type { Metadata } from 'next';
import FairHeaderCard from '@/components/book-fair-admin/FairHeaderCard';
import InviteTree, {
  type InviteTreeClassroom,
} from '@/components/book-fair-admin/InviteTree';
import MarketingTimeline from '@/components/book-fair-admin/MarketingTimeline';
import PastFairsSection, {
  type PastFairItem,
} from '@/components/book-fair-admin/PastFairsSection';
import PrepChecklist, { type TaxCertStatus } from '@/components/book-fair-admin/PrepChecklist';
import ResourceHub from '@/components/book-fair-admin/ResourceHub';
import { getCompany, getDeal, getDeals, parseDollarString } from '@/lib/book-fair-admin/hubspot';
import {
  getAveDollarsEarned,
  getAveDollarsSpent,
  getClassroomsWithTeachers,
  getParentCountsByClassroom,
  getPastFairs,
  getSchool,
  getSchoolParentSummary,
  getUpcomingFair,
} from '@/lib/book-fair-admin/queries';
import { requireSession } from '@/lib/book-fair-admin/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book Fair Admin Dashboard | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function isTruthyFlag(value: string | null | undefined): boolean {
  return ['true', 'yes', '1'].includes((value ?? '').toLowerCase());
}

export default async function BookFairAdminDashboard() {
  const session = await requireSession();
  const schoolId = session.school_id;

  const [school, upcomingFair, pastFairs, classroomRows, parentCounts, parentSummary] =
    await Promise.all([
      getSchool(schoolId),
      getUpcomingFair(schoolId),
      getPastFairs(schoolId),
      getClassroomsWithTeachers(schoolId),
      getParentCountsByClassroom(schoolId),
      getSchoolParentSummary(schoolId),
    ]);

  // HubSpot reads degrade to null — the page renders Postgres-only data with
  // "unavailable" notes when HubSpot is unreachable.
  const [company, upcomingDeal, pastDealsById] = await Promise.all([
    school?.hsCompanyId ? getCompany(school.hsCompanyId) : Promise.resolve(null),
    upcomingFair?.hsDealId ? getDeal(upcomingFair.hsDealId) : Promise.resolve(null),
    getDeals(pastFairs.map((f) => f.hsDealId).filter((id): id is string => !!id)),
  ]);

  // --- Checklist inputs ---
  let taxCertStatus: TaxCertStatus = 'unavailable';
  if (company) {
    const props = company.properties;
    taxCertStatus =
      (props.tax_exempt_form ?? '').trim() !== '' ||
      (props.tax_exempt_received__manually_ ?? '').toLowerCase() === 'yes' ||
      isTruthyFlag(props.tax_exempt_received__manually_)
        ? 'complete'
        : 'missing';
  }
  const classroomCount = classroomRows.length;
  const invitedCount = classroomRows.filter((c) => c.invitedTeacherEmail != null).length;
  const activeTeacherCount = classroomRows.filter((c) => c.teacherProfileId != null).length;

  // --- Invite tree ---
  const countsByClassroom = new Map(parentCounts.map((p) => [p.classroomId, p]));
  const treeClassrooms: InviteTreeClassroom[] = classroomRows.map((c) => {
    const status: InviteTreeClassroom['status'] =
      c.teacherProfileId != null ? 'active' : c.invitedTeacherEmail != null ? 'invited' : 'pending';
    const teacherName =
      [c.invitedTeacherFirstName, c.invitedTeacherLastName].filter(Boolean).join(' ') || null;
    const counts = countsByClassroom.get(c.id);
    return {
      id: c.id,
      name: c.classroomName,
      teacherName,
      teacherEmail: c.invitedTeacherEmail,
      status,
      statusDetail: c.teacherStatus,
      fullyActive: c.teacherTosAcceptedAt != null,
      parentCount: counts?.parents ?? 0,
      activeParentCount: counts?.activeParents ?? 0,
    };
  });
  const treeSummary = {
    invited: treeClassrooms.filter((c) => c.status === 'invited').length,
    active: treeClassrooms.filter((c) => c.status === 'active').length,
    pending: treeClassrooms.filter((c) => c.status === 'pending').length,
    parentsJoined: parentSummary.parents,
  };

  // --- Past fairs ---
  const pastItems: PastFairItem[] = await Promise.all(
    pastFairs.map(async (fair) => {
      const [earned, spent] = await Promise.all([
        getAveDollarsEarned(fair.id),
        getAveDollarsSpent(schoolId, fair.startDate, fair.endDate),
      ]);
      const deal = fair.hsDealId ? (pastDealsById.get(fair.hsDealId) ?? null) : null;
      const rawSales = deal?.properties.total_sales ?? null;
      const parsedSales = parseDollarString(rawSales);
      return {
        id: fair.id,
        startDate: fair.startDate,
        endDate: fair.endDate,
        totalSalesDisplay: parsedSales !== null ? money(parsedSales) : rawSales || null,
        totalItemsSold: deal?.properties.total_items_sold ?? null,
        hubspotUnavailable: !!fair.hsDealId && !deal,
        aveDollarsEarned: earned,
        aveDollarsSpent: spent.amount,
        spendIsCertain: spent.isSpendCertain,
      };
    })
  );

  const isVirtual = upcomingDeal ? isTruthyFlag(upcomingDeal.properties.virtual_book_fair) : null;
  const schoolName = school?.name ?? 'Your school';

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-[#02176f] text-2xl sm:text-3xl font-bold"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Book Fair Admin Dashboard
          </h1>
          <form action="/book-fair-admin/logout" method="POST">
            <button
              type="submit"
              className="text-sm text-[#7e828f] hover:text-[#02176f] underline transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {upcomingFair ? (
          <>
            <FairHeaderCard
              schoolName={schoolName}
              startDate={upcomingFair.startDate}
              endDate={upcomingFair.endDate}
              isVirtual={isVirtual}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <PrepChecklist
                taxCertStatus={taxCertStatus}
                classroomCount={classroomCount}
                invitedCount={invitedCount}
                activeTeacherCount={activeTeacherCount}
              />
              <MarketingTimeline fairStartDate={upcomingFair.startDate} />
            </div>
            <InviteTree classrooms={treeClassrooms} summary={treeSummary} />
            <ResourceHub />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <h2
                className="text-[#02176f] text-xl font-semibold mb-2"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                No upcoming fair scheduled
              </h2>
              <p className="text-[#7e828f]">
                When your next fair is booked it will appear here. Need help scheduling one? Call{' '}
                <a href="tel:888-771-2321" className="text-[#0088ff] hover:underline">
                  888-771-2321
                </a>
                .
              </p>
            </div>
            <ResourceHub />
          </>
        )}

        <PastFairsSection items={pastItems} />
      </div>
    </div>
  );
}
