import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedAdminEmail } from '@/lib/auth/admin-allowlist';
import { getUpcomingFairsAllSchools } from '@/lib/book-fair-admin/queries';
import { getDealsByIds } from '@/lib/book-fair-admin/hubspot';
import { FAIR_STATUS_STEPS, fairStatusStep } from '@/lib/book-fair-admin/fair-status';
import FairsBoard, { type BoardFair } from '@/components/admin/FairsBoard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upcoming Fairs | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_LABEL: Record<string, string> = {
  'school book fair': 'School',
  'parish book fair': 'Parish',
  'public book fair': 'Public',
  'virtual book fair': 'Virtual',
};

function fmtRange(startStr: string, endStr: string): string {
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) return `${mo(s)} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  return `${mo(s)} ${s.getDate()} – ${mo(e)} ${e.getDate()}, ${e.getFullYear()}`;
}

function countdown(startMs: number, endMs: number, now: number): string {
  if (startMs <= now && now <= endMs) return 'In progress';
  const days = Math.round((startMs - now) / DAY_MS);
  if (days <= 0) return 'Starts today';
  if (days === 1) return 'Starts tomorrow';
  return `Starts in ${days} days`;
}

export default async function UpcomingFairsPage() {
  const store = await cookies();
  const email = await verifySession(
    store.get(COOKIE_NAME)?.value,
    process.env.ADMIN_SESSION_SECRET ?? ''
  );
  const isAdmin = !!email && isAllowedAdminEmail(email);

  async function logout() {
    'use server';
    const s = await cookies();
    s.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
    redirect('/admin/login');
  }

  const now = Date.now();
  const rows = await getUpcomingFairsAllSchools();
  const deals = await getDealsByIds(rows.map((r) => r.hsDealId).filter((id): id is string => !!id));

  const fairs: BoardFair[] = rows
    .map((r): BoardFair | null => {
      const deal = r.hsDealId ? deals.get(r.hsDealId) ?? null : null;
      const step = deal ? fairStatusStep(deal.properties.dealstage) : null;
      // A loaded deal with a LOST/cancelled stage -> drop it from the list.
      if (deal && step === null) return null;

      const startMs = new Date(r.startDate).getTime();
      const endMs = new Date(r.endDate).getTime();
      const daysUntilStart = Math.floor((startMs - now) / DAY_MS);
      const bucket: BoardFair['bucket'] =
        startMs <= now || daysUntilStart <= 7 ? 'week' : daysUntilStart <= 31 ? 'month' : 'later';

      const rawType = (deal?.properties.dealtype ?? '').toLowerCase();
      return {
        key: r.fairId,
        schoolId: r.schoolId,
        schoolName: r.schoolName ?? 'Unknown school',
        location: [r.city, r.state].filter(Boolean).join(', '),
        dateRange: fmtRange(r.startDate, r.endDate),
        countdown: countdown(startMs, endMs, now),
        startMs,
        endMs,
        step,
        stageLabel: step ? FAIR_STATUS_STEPS[step - 1] : 'Status unavailable',
        typeLabel: TYPE_LABEL[rawType] ?? null,
        hubspotMissing: !!r.hsDealId && !deal,
        bucket,
      };
    })
    .filter((f): f is BoardFair => f !== null);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold whitespace-nowrap truncate">
            Upcoming Book Fairs
          </h1>
          <nav className="flex items-center gap-1 shrink-0 whitespace-nowrap text-sm">
            {isAdmin && (
              <a
                href="/admin/bot-knowledge"
                className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
              >
                Knowledge base
              </a>
            )}
            {isAdmin && <span className="mx-2 h-5 w-px bg-white/20" aria-hidden />}
            {email && (
              <span
                className="hidden md:inline-flex items-center gap-1.5 text-white/70 max-w-[220px]"
                title={`Signed in as ${email}`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="truncate">{email}</span>
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="ml-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        <FairsBoard fairs={fairs} nowMs={now} />
      </main>
    </div>
  );
}
