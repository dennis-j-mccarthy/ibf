import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, COOKIE_NAME } from '@/lib/auth/session';
import { isAllowedAdminEmail } from '@/lib/auth/admin-allowlist';
import { getUpcomingFairsAllSchools } from '@/lib/book-fair-admin/queries';
import { getDealsByIds } from '@/lib/book-fair-admin/hubspot';
import { FAIR_STATUS_STEPS, fairStatusStep } from '@/lib/book-fair-admin/fair-status';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upcoming Fairs | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Status step (1..5) -> row accent + pill styling. Cancelled fairs (step null
// from a LOST deal stage) are filtered out before rendering.
const STEP_STYLE: Record<number, { accent: string; pill: string }> = {
  1: { accent: '#0088ff', pill: 'bg-[#e6f2ff] text-[#02176f]' }, // Booked
  2: { accent: '#f5a623', pill: 'bg-[#fff4e0] text-[#8a5a00]' }, // Prepping
  3: { accent: '#7b61ff', pill: 'bg-[#efeaff] text-[#4b2fb3]' }, // Books shipping
  4: { accent: '#00c853', pill: 'bg-[#e3f9ec] text-[#0a7a3d]' }, // Fair week
  5: { accent: '#7e828f', pill: 'bg-[#eef0f3] text-[#4a4d57]' }, // Wrapped up
};
const UNKNOWN_STYLE = { accent: '#c7ccd4', pill: 'bg-[#eef0f3] text-[#7e828f]' };

const TYPE_LABEL: Record<string, string> = {
  'school book fair': 'School',
  'parish book fair': 'Parish',
  'public book fair': 'Public',
  'virtual book fair': 'Virtual',
};

type Bucket = 'week' | 'month' | 'later';
const BUCKET_META: Record<Bucket, { title: string; blurb: string }> = {
  week: { title: 'This week', blurb: 'In progress or starting within 7 days' },
  month: { title: 'This month', blurb: 'Starting in the next 8–31 days' },
  later: { title: 'Later', blurb: 'More than a month out' },
};
const BUCKET_ORDER: Bucket[] = ['week', 'month', 'later'];

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

  const fairs = rows
    .map((r) => {
      const deal = r.hsDealId ? deals.get(r.hsDealId) ?? null : null;
      const step = deal ? fairStatusStep(deal.properties.dealstage) : null;
      // A loaded deal with a LOST/cancelled stage -> drop it from the list.
      if (deal && step === null) return null;

      const startMs = new Date(r.startDate).getTime();
      const endMs = new Date(r.endDate).getTime();
      const daysUntilStart = Math.floor((startMs - now) / DAY_MS);
      const bucket: Bucket =
        startMs <= now || daysUntilStart <= 7 ? 'week' : daysUntilStart <= 31 ? 'month' : 'later';

      const rawType = (deal?.properties.dealtype ?? '').toLowerCase();
      return {
        key: r.fairId,
        schoolName: r.schoolName ?? 'Unknown school',
        location: [r.city, r.state].filter(Boolean).join(', '),
        dateRange: fmtRange(r.startDate, r.endDate),
        countdown: countdown(startMs, endMs, now),
        step,
        stageLabel: step ? FAIR_STATUS_STEPS[step - 1] : 'Status unavailable',
        typeLabel: TYPE_LABEL[rawType] ?? null,
        hubspotMissing: !!r.hsDealId && !deal,
        bucket,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const byBucket: Record<Bucket, typeof fairs> = { week: [], month: [], later: [] };
  for (const f of fairs) byBucket[f.bucket].push(f);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-brother text-xl font-semibold">Upcoming Book Fairs</h1>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <a href="/admin/bot-knowledge" className="text-sm underline opacity-90 hover:opacity-100">
                Knowledge base
              </a>
            )}
            {email && (
              <span className="hidden sm:inline text-sm opacity-90">
                Signed in as <strong className="font-semibold">{email}</strong>
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md font-medium"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-gray-600">{fairs.length} upcoming fair(s)</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
            {([1, 2, 3, 4, 5] as const).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STEP_STYLE[s].accent }}
                />
                {FAIR_STATUS_STEPS[s - 1]}
              </span>
            ))}
          </div>
        </div>

        {fairs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            No upcoming fairs found.
          </div>
        ) : (
          <div className="space-y-8">
            {BUCKET_ORDER.map((bucket) => {
              const list = byBucket[bucket];
              if (list.length === 0) return null;
              const meta = BUCKET_META[bucket];
              return (
                <section key={bucket}>
                  <div className="mb-3">
                    <h2 className="font-brother text-[#02176f] text-lg font-semibold">
                      {meta.title}{' '}
                      <span className="text-gray-400 font-normal text-base">({list.length})</span>
                    </h2>
                    <p className="text-xs text-gray-500">{meta.blurb}</p>
                  </div>
                  <div className="space-y-2.5">
                    {list.map((f) => {
                      const style = f.step ? STEP_STYLE[f.step] : UNKNOWN_STYLE;
                      return (
                        <div
                          key={f.key}
                          className="bg-white rounded-xl shadow-sm border-l-4 pl-4 pr-5 py-3.5 flex items-center justify-between gap-4"
                          style={{ borderLeftColor: style.accent }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[#02176f] truncate">{f.schoolName}</span>
                              {f.typeLabel && (
                                <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {f.typeLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {f.dateRange}
                              {f.location ? ` · ${f.location}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.pill}`}>
                              {f.stageLabel}
                            </span>
                            <span className="text-xs text-gray-400">{f.countdown}</span>
                            {f.hubspotMissing && (
                              <span className="text-[10px] text-amber-600">HubSpot unavailable</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
