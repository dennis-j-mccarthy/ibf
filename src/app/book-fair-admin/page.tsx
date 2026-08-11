import type { Metadata } from 'next';
import FairHeaderCard from '@/components/book-fair-admin/FairHeaderCard';
import HeaderIcon from '@/components/book-fair-admin/HeaderIcon';
import PlanViews from '@/components/book-fair-admin/PlanViews';
import ShareSignupCard from '@/components/book-fair-admin/ShareSignupCard';
import InviteTree, {
  type InviteTreeClassroom,
} from '@/components/book-fair-admin/InviteTree';
import PastFairsSection, {
  type PastFairItem,
} from '@/components/book-fair-admin/PastFairsSection';
import { type TaxCertStatus } from '@/components/book-fair-admin/PrepChecklist';
import RepCard from '@/components/book-fair-admin/RepCard';
import ResourceHub from '@/components/book-fair-admin/ResourceHub';
import TemplateCenter from '@/components/book-fair-admin/TemplateCenter';
import WidgetMaker from '@/components/book-fair-admin/WidgetMaker';
import type { WidgetData } from '@/components/book-fair-admin/widgets';
import { formatDateET, daysUntil } from '@/lib/book-fair-admin/dates';
import { getTemplates, resolveTemplate, templatesForAudience } from '@/lib/templates/store';
import { fairStatusStep } from '@/lib/book-fair-admin/fair-status';
import { buildRep } from '@/lib/book-fair-admin/reps';
import { getCompany, getDeal, getDeals, getOwner, parseDollarString } from '@/lib/book-fair-admin/hubspot';
import {
  getAveDollarsEarned,
  getAveDollarsSpent,
  getClassroomsWithTeachers,
  getHasFairAdmin,
  getParentCountsByClassroom,
  getPastFairs,
  getSchool,
  getSchoolParentSummary,
  getUpcomingFair,
  getWishlistItemCountsByClassroom,
  getWishlistLeaderboard,
} from '@/lib/book-fair-admin/queries';
import { requireSession } from '@/lib/book-fair-admin/session';
import { getResources } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book Fair Admin Dashboard | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function isTruthyFlag(value: string | null | undefined): boolean {
  return ['true', 'yes', '1'].includes((value ?? '').toLowerCase());
}

export default async function BookFairAdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; template?: string }>;
}) {
  const session = await requireSession();
  const schoolId = session.school_id;
  const resources = await getResources();

  const [
    school,
    upcomingFair,
    pastFairs,
    classroomRows,
    parentCounts,
    parentSummary,
    wishlistCounts,
    wishlistLeaderboard,
    hasFairAdmin,
  ] = await Promise.all([
    getSchool(schoolId),
    getUpcomingFair(schoolId),
    getPastFairs(schoolId),
    getClassroomsWithTeachers(schoolId),
    getParentCountsByClassroom(schoolId),
    getSchoolParentSummary(schoolId),
    getWishlistItemCountsByClassroom(schoolId),
    getWishlistLeaderboard(schoolId, 5),
    getHasFairAdmin(schoolId),
  ]);
  const wishlistByClassroom = new Map(wishlistCounts.map((w) => [w.classroomId, w.itemCount]));

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
      wishlistItemCount: wishlistByClassroom.get(c.id) ?? 0,
      createdAt: c.createdAt,
    };
  });
  const treeSummary = {
    invited: treeClassrooms.filter((c) => c.status === 'invited').length,
    active: treeClassrooms.filter((c) => c.status === 'active').length,
    pending: treeClassrooms.filter((c) => c.status === 'pending').length,
    parentsJoined: parentSummary.parents,
  };

  // Data-driven checklist items (the rest are manually checkable in the component).
  const checklistAutoDone: Record<string, boolean> = {
    admin: hasFairAdmin,
    tax: taxCertStatus === 'complete',
    invite: classroomCount > 0 && treeSummary.pending === 0,
    signup: classroomCount > 0 && treeSummary.active === classroomCount,
  };
  // Admin signup link (role=admin assumed — confirm the exact role value).
  const adminSignupUrl = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&role=admin`;
  // slug -> full Resource for the checklist's resource modals.
  const resourceBySlug: Record<string, (typeof resources)[number]> = {};
  for (const r of resources) {
    if (!r.isActive) continue;
    resourceBySlug[r.slug] = r;
  }

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

  // Goal tracker: current fair sales (post during/after the fair) vs. the most
  // recent past fair's total as a suggested target.
  const currentSales = parseDollarString(upcomingDeal?.properties.total_sales ?? null);
  let lastFairSales: number | null = null;
  for (const fair of pastFairs) {
    const deal = fair.hsDealId ? pastDealsById.get(fair.hsDealId) : null;
    const v = parseDollarString(deal?.properties.total_sales ?? null);
    if (v !== null) {
      lastFairSales = v;
      break;
    }
  }

  const isVirtual = upcomingDeal ? isTruthyFlag(upcomingDeal.properties.virtual_book_fair) : null;
  const schoolName = school?.name ?? 'Your school';
  const logoDomain = company?.properties.domain ?? null;
  const ownerId = upcomingDeal?.properties.hubspot_owner_id;
  const rep = buildRep(ownerId, ownerId ? await getOwner(ownerId) : null);
  const realStep = fairStatusStep(upcomingDeal?.properties.dealstage);
  // Dev-only preview: ?step=N forces the fair-status step to preview each state.
  const sp = await searchParams;
  const overrideStep =
    process.env.NODE_ENV !== 'production' && sp?.step ? Number(sp.step) : null;
  const currentStep =
    overrideStep && overrideStep >= 1 && overrideStep <= 5 ? overrideStep : realStep;

  // Contacts from the upcoming fair's HubSpot deal.
  const dp = upcomingDeal?.properties;
  const coordinator =
    dp && (dp.chair_organizer_first_name || dp.chair_organizer_email)
      ? {
          name: [dp.chair_organizer_first_name, dp.chair_organizer_last_name].filter(Boolean).join(' '),
          email: dp.chair_organizer_email ?? null,
        }
      : null;
  const aveAdmin =
    dp && (dp.ave_dollars_first_name || dp.ave_dollar_email)
      ? {
          name: [dp.ave_dollars_first_name, dp.ave_dollars_last_name].filter(Boolean).join(' '),
          email: dp.ave_dollar_email ?? null,
        }
      : null;

  // Link to the public planning calendar, pre-filled with this fair's type + date.
  const DEAL_TYPE_TO_PLANNER: Record<string, string> = {
    'school book fair': 'catholic-in-person',
    'parish book fair': 'parish-in-person',
    'public book fair': 'public-in-person',
    'virtual book fair': 'catholic-virtual',
  };
  const plannerType =
    DEAL_TYPE_TO_PLANNER[(dp?.dealtype ?? '').toLowerCase()] ?? 'catholic-in-person';
  const plannerDate = upcomingFair?.startDate?.slice(0, 10);
  const FAIR_TYPE_TO_AUDIENCE: Record<string, string> = {
    'catholic-in-person': 'Catholic In Person',
    'catholic-virtual': 'Catholic In Person', // virtual resources share the Catholic audience tag
    'public-in-person': 'Public In Person',
    'parish-in-person': 'Parish In Person',
  };
  const resourceAudience = FAIR_TYPE_TO_AUDIENCE[plannerType];

  const PILL_LABELS: Record<string, string> = {
    'catholic-in-person': 'Catholic In-Person',
    'catholic-virtual': 'Catholic Virtual',
    'public-in-person': 'Public In-Person',
    'parish-in-person': 'Parish In-Person',
  };
  const fairTypeLabel = PILL_LABELS[plannerType] ?? null;

  // Sign-up links the coordinator shares (school-wide, by role).
  const familyUrl = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&role=parent`;
  const teacherUrl = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&role=teacher`;

  // Marketing templates, merged with this fair. Coordinators get finished copy
  // rather than the fill-in-the-blank PDFs.
  const fairStart = upcomingFair?.startDate ?? '';
  const fairEnd = upcomingFair?.endDate ?? '';
  const templateValues = {
    school_name: schoolName,
    school_city: school?.city ?? '',
    school_state: school?.state ?? '',
    fair_dates:
      fairStart && fairEnd
        ? `${formatDateET(fairStart, { year: false })} through ${formatDateET(fairEnd)}`
        : '',
    fair_start_date: fairStart ? formatDateET(fairStart) : '',
    fair_end_date: fairEnd ? formatDateET(fairEnd) : '',
    fair_type: fairTypeLabel ?? '',
    fair_location: '',
    shop_url: familyUrl,
    family_signup_url: familyUrl,
    teacher_signup_url: teacherUrl,
    coordinator_name: coordinator?.name ?? '',
    coordinator_email: coordinator?.email ?? '',
    principal_name: dp?.principal_name ?? '',
    rep_name: rep ? `${rep.firstName} ${rep.lastName}`.trim() : '',
    days_until_fair: fairStart ? String(daysUntil(fairStart) ?? '') : '',
    classroom_count: String(classroomCount),
    current_year: String(new Date().getFullYear()),
  };
  const allTemplates = await getTemplates();
  const coordinatorTemplates = templatesForAudience(allTemplates, resourceAudience).map((t) =>
    resolveTemplate(t, templateValues)
  );
  // slug -> merged template, so checklist tasks can open the finished letter.
  const templateBySlug = Object.fromEntries(coordinatorTemplates.map((t) => [t.slug, t]));

  const widgetData: WidgetData = {
    schoolName,
    fairStartDate: upcomingFair?.startDate ?? null,
    fairEndDate: upcomingFair?.endDate ?? null,
    prevSales: lastFairSales,
    goal: null,
    currentSales,
    familyUrl,
    teacherUrl,
    leaderboard: wishlistLeaderboard,
  };

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
              city={school?.city}
              state={school?.state}
              startDate={upcomingFair.startDate}
              endDate={upcomingFair.endDate}
              isVirtual={isVirtual}
              fairTypeLabel={fairTypeLabel}
              coordinator={coordinator}
              aveAdmin={aveAdmin}
              logoDomain={logoDomain}
              currentStep={currentStep}
              schoolId={schoolId}
              currentSales={currentSales}
              lastFairSales={lastFairSales}
            />
            <PastFairsSection items={pastItems} />
            <PlanViews
              checklist={{
                schoolId,
                fairType: plannerType,
                autoDone: checklistAutoDone,
                taxCertMissing: taxCertStatus === 'missing',
                resourcesBySlug: resourceBySlug,
                templatesBySlug: templateBySlug,
                adminSignupUrl,
                fairStartDate: plannerDate,
              }}
              planner={{
                resources,
                initialFairType: plannerType,
                initialFairDate: plannerDate,
                lockSettings: true,
              }}
            />
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h3
                className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold mb-[30px]!"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                <HeaderIcon name="comms" />
                Communications
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                {rep && <RepCard rep={rep} flat />}
                <ShareSignupCard url={familyUrl} variant="family" flat />
                <ShareSignupCard url={teacherUrl} variant="teacher" flat />
              </div>
            </section>
            <TemplateCenter templates={coordinatorTemplates} initialSlug={sp?.template} />
            <WidgetMaker schoolId={schoolId} origin={process.env.NEXT_PUBLIC_APP_URL ?? ''} data={widgetData} />
            <ResourceHub resources={resources} audience={resourceAudience} isVirtual={plannerType === 'catholic-virtual'} />
            <InviteTree classrooms={treeClassrooms} schoolId={schoolId} nowMs={Date.now()} />
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
            <PastFairsSection items={pastItems} />
            <ResourceHub resources={resources} audience={resourceAudience} isVirtual={plannerType === 'catholic-virtual'} />
          </>
        )}
      </div>
    </div>
  );
}
