// Dev/preview-only visual demo of the Book Fair Admin Dashboard with mock
// data — no auth, no Postgres, no HubSpot. Returns 404 on the production
// deployment (VERCEL_ENV=production) but renders on Vercel previews and
// localhost.
// Note: expanding a classroom in the invite tree hits the real (session-gated)
// parents API, so it will show "Couldn't load parents." here.
import { notFound } from 'next/navigation';
import FairHeaderCard from '@/components/book-fair-admin/FairHeaderCard';
import InviteTree, {
  type InviteTreeClassroom,
} from '@/components/book-fair-admin/InviteTree';
import MarketingTimeline from '@/components/book-fair-admin/MarketingTimeline';
import PastFairsSection, {
  type PastFairItem,
} from '@/components/book-fair-admin/PastFairsSection';
import PrepChecklist from '@/components/book-fair-admin/PrepChecklist';
import ResourceHub from '@/components/book-fair-admin/ResourceHub';

const MOCK_CLASSROOMS: InviteTreeClassroom[] = [
  {
    id: 1,
    name: 'Mrs. Alvarez — 2nd Grade',
    teacherName: 'Maria Alvarez',
    teacherEmail: 'malvarez@school.org',
    status: 'active',
    statusDetail: null,
    fullyActive: true,
    parentCount: 18,
    activeParentCount: 12,
  },
  {
    id: 2,
    name: 'Mr. Brennan — 4th Grade',
    teacherName: 'Patrick Brennan',
    teacherEmail: 'pbrennan@school.org',
    status: 'invited',
    statusDetail: 'invite sent',
    fullyActive: false,
    parentCount: 15,
    activeParentCount: 0,
  },
  {
    id: 3,
    name: 'Ms. Chen — 5th Grade',
    teacherName: null,
    teacherEmail: null,
    status: 'pending',
    statusDetail: null,
    fullyActive: false,
    parentCount: 0,
    activeParentCount: 0,
  },
];

const MOCK_PAST_FAIRS: PastFairItem[] = [
  {
    id: 101,
    startDate: '2025-11-03 08:00:00',
    endDate: '2025-11-07 15:00:00',
    totalSalesDisplay: '$4,812.50',
    totalItemsSold: '391',
    hubspotUnavailable: false,
    aveDollarsEarned: 481.25,
    aveDollarsSpent: 362.1,
    spendIsCertain: true,
  },
  {
    id: 102,
    startDate: '2025-03-10 08:00:00',
    endDate: '2025-03-14 15:00:00',
    totalSalesDisplay: null,
    totalItemsSold: null,
    hubspotUnavailable: true,
    aveDollarsEarned: 297.8,
    aveDollarsSpent: 305.0,
    spendIsCertain: false,
  },
];

export default function BookFairAdminPreview() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <div className="bg-[#f5f5f5] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-[#ffd41d]/30 border border-[#ffd41d] rounded-lg px-4 py-2 text-sm text-[#1a1b1f]">
          Dev preview with mock data — not the real dashboard.
        </div>
        <h1
          className="text-[#02176f] text-2xl sm:text-3xl font-bold"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Book Fair Admin Dashboard
        </h1>
        <FairHeaderCard
          schoolName="St. Thomas Aquinas Academy"
          startDate="2026-08-24 08:00:00"
          endDate="2026-08-28 15:00:00"
          isVirtual={false}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <PrepChecklist
            taxCertStatus="missing"
            classroomCount={3}
            invitedCount={2}
            activeTeacherCount={1}
          />
          <MarketingTimeline fairStartDate="2026-08-24 08:00:00" />
        </div>
        <InviteTree
          classrooms={MOCK_CLASSROOMS}
          summary={{ invited: 1, active: 1, pending: 1, parentsJoined: 27 }}
        />
        <ResourceHub />
        <PastFairsSection items={MOCK_PAST_FAIRS} />
      </div>
    </div>
  );
}
