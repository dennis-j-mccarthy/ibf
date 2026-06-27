'use client';

import { useEffect, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';

export type WidgetType =
  | 'countdown'
  | 'goal'
  | 'teacher'
  | 'family'
  | 'signup'
  | 'leaderboard'
  | 'family-countdown'
  | 'grant'
  | 'support';

export interface WidgetData {
  schoolName: string;
  fairStartDate?: string | null;
  fairEndDate?: string | null;
  prevSales?: number | null;
  goal?: number | null;
  currentSales?: number | null;
  familyUrl?: string | null;
  teacherUrl?: string | null;
  leaderboard?: { name: string; itemCount: number }[];
}

export interface WidgetOptions {
  theme?: 'light' | 'dark';
  loupio?: boolean;
}

const font = { fontFamily: 'brother-1816, sans-serif' };
const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function daysUntil(iso: string): number {
  const target = new Date(iso.replace(' ', 'T')).getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86_400_000));
}
function rangeLabel(start?: string | null, end?: string | null): string {
  if (!start) return '';
  const s = new Date(start.replace(' ', 'T'));
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const sLabel = s.toLocaleDateString('en-US', opts);
  if (!end) return sLabel;
  const e = new Date(end.replace(' ', 'T'));
  return `${sLabel} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

// ---- Shared chrome -------------------------------------------------------

function Frame({
  theme = 'light',
  loupio = true,
  accent = '#0088ff',
  children,
}: {
  theme?: 'light' | 'dark';
  loupio?: boolean;
  accent?: string;
  children: ReactNode;
}) {
  const dark = theme === 'dark';
  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-lg w-full"
      style={{ background: dark ? '#02176f' : '#ffffff', color: dark ? '#ffffff' : '#1a1b1f' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: accent }} />
      <div className="p-5 pt-6">{children}</div>

      {loupio && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/images/Loupio-p-500.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 -right-3 w-28 h-28 object-contain animate-[loupio-bob_3s_ease-in-out_infinite] drop-shadow-lg"
        />
      )}

      <div
        className="flex items-center gap-1.5 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide"
        style={{
          color: dark ? 'rgba(255,255,255,0.55)' : '#a0a4b0',
          borderTop: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #f0f0f0',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dark ? '/images/ibf-logo-white.png' : '/images/ibf-logo-blue.png'}
          alt="Ignatius Book Fairs"
          className="h-3.5 w-auto object-contain opacity-80"
        />
        Book Fair
      </div>
    </div>
  );
}

function Eyebrow({ children, color }: { children: ReactNode; color: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color }}>
      {children}
    </p>
  );
}

// ---- Countdown -----------------------------------------------------------

function CountdownWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
  useEffect(() => {
    if (!data.fairStartDate) return;
    const target = new Date(data.fairStartDate.replace(' ', 'T')).getTime();
    const tick = () => {
      const diff = Math.max(0, target - Date.now());
      setT({
        d: Math.floor(diff / 86_400_000),
        h: Math.floor((diff % 86_400_000) / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.fairStartDate]);

  const dark = options.theme === 'dark';
  const pad = (n: number) => String(n).padStart(2, '0');
  const cells = [
    { label: 'Days', value: t ? String(t.d) : '--' },
    { label: 'Hrs', value: t ? pad(t.h) : '--' },
    { label: 'Min', value: t ? pad(t.m) : '--' },
    { label: 'Sec', value: t ? pad(t.s) : '--' },
  ];
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#ff6445">
      <Eyebrow color="#ff6445">{data.schoolName} Book Fair</Eyebrow>
      <div className="flex gap-1.5">
        {cells.map((c) => (
          <div
            key={c.label}
            className="flex flex-col items-center rounded-lg px-2 py-1.5 flex-1"
            style={{ background: dark ? 'rgba(255,255,255,0.1)' : '#f3f5fa' }}
          >
            <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ ...font, color: dark ? '#ffd41d' : '#02176f' }}>
              {c.value}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide mt-1" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#a0a4b0' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-sm mt-2 font-medium pr-16" style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#7e828f' }}>
        {rangeLabel(data.fairStartDate, data.fairEndDate) || 'Coming soon'}
      </p>
    </Frame>
  );
}

// ---- Goal & sales --------------------------------------------------------

function GoalWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const dark = options.theme === 'dark';
  const goal = data.goal || (data.prevSales ? Math.ceil(data.prevSales / 500) * 500 : 5000);
  const current = data.currentSales ?? 0;
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#50db92">
      <Eyebrow color="#1a9d5f">Our fundraising goal</Eyebrow>
      <p className="text-3xl font-extrabold leading-none" style={{ ...font, color: dark ? '#ffd41d' : '#02176f' }}>
        {money(current)}
        <span className="text-base font-semibold" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#7e828f' }}>
          {' '}
          of {money(goal)}
        </span>
      </p>
      <div className="mt-3 h-3 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.15)' : '#eef0f5' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#50db92' }} />
      </div>
      {data.prevSales != null && (
        <p className="text-xs mt-2 font-medium" style={{ color: dark ? 'rgba(255,255,255,0.6)' : '#7e828f' }}>
          Last fair we raised <strong>{money(data.prevSales)}</strong> — help us beat it!
        </p>
      )}
    </Frame>
  );
}

// ---- Invite / signup (QR + CTA) ------------------------------------------

const INVITE_COPY: Record<'teacher' | 'family' | 'signup', { eyebrow: string; title: string; cta: string; accent: string }> = {
  teacher: { eyebrow: 'Teachers', title: 'Build your classroom wishlist', cta: 'Register your classroom', accent: '#0088ff' },
  family: { eyebrow: 'Families', title: 'Shop our online Book Fair', cta: 'Sign up & shop', accent: '#ff6445' },
  signup: { eyebrow: "Let's read together", title: 'Join our Book Fair!', cta: 'Sign up now', accent: '#0088ff' },
};

function InviteWidget({
  data,
  options,
  variant,
}: {
  data: WidgetData;
  options: WidgetOptions;
  variant: 'teacher' | 'family' | 'signup';
}) {
  const url = variant === 'teacher' ? data.teacherUrl : data.familyUrl;
  const [qr, setQr] = useState<string | null>(null);
  const dark = options.theme === 'dark';
  const copy = INVITE_COPY[variant];

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: dark ? '#ffffff' : '#02176f', light: '#00000000' } })
      .then(setQr)
      .catch(() => {});
  }, [url, dark]);

  return (
    <Frame theme={options.theme} loupio={options.loupio} accent={copy.accent}>
      <Eyebrow color={copy.accent}>{copy.eyebrow}</Eyebrow>
      <p className="text-xl font-bold leading-tight mb-3 pr-16" style={font}>
        {copy.title}
      </p>
      <div className="flex items-center gap-3">
        {qr && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Sign-up QR code" className="w-20 h-20 flex-shrink-0" />
        )}
        <a
          href={url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-center font-bold text-white rounded-full px-5 py-3 text-sm transition-transform hover:scale-105"
          style={{ ...font, background: copy.accent }}
        >
          {copy.cta} →
        </a>
      </div>
      <p className="text-[11px] mt-2 font-medium" style={{ color: dark ? 'rgba(255,255,255,0.55)' : '#a0a4b0' }}>
        Scan the code or tap the button
      </p>
    </Frame>
  );
}

// ---- Wishlist leaderboard ------------------------------------------------

const MEDALS = ['#ffd41d', '#c4ccd6', '#e09a5a'];

function LeaderboardWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const dark = options.theme === 'dark';
  const rows = (data.leaderboard ?? []).slice(0, 5);
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#ffc107">
      <Eyebrow color="#b8860b">Wishlist leaderboard</Eyebrow>
      <p className="text-lg font-bold leading-tight mb-3" style={font}>
        Most books wishlisted
      </p>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#7e828f' }}>
          Wishlists are filling up — check back soon!
        </p>
      ) : (
        <ol className="space-y-1.5 pr-16">
          {rows.map((r, i) => (
            <li key={r.name} className="flex items-center gap-2.5">
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: i < 3 ? MEDALS[i] : dark ? 'rgba(255,255,255,0.12)' : '#eef0f5',
                  color: i < 3 ? '#3a2c00' : dark ? '#fff' : '#7e828f',
                }}
              >
                {i + 1}
              </span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">{r.name}</span>
              <span className="flex-shrink-0 text-sm font-bold tabular-nums" style={{ color: dark ? '#ffd41d' : '#02176f' }}>
                {r.itemCount}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Frame>
  );
}

// ---- Parent-audience widgets ---------------------------------------------

function CtaButton({ url, label, accent }: { url?: string | null; label: string; accent: string }) {
  return (
    <a
      href={url ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block text-center font-bold text-white rounded-full px-5 py-2.5 text-sm transition-transform hover:scale-105"
      style={{ ...font, background: accent }}
    >
      {label} →
    </a>
  );
}

function FamilyCountdownWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    if (!data.fairStartDate) return;
    const tick = () => setDays(daysUntil(data.fairStartDate!));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [data.fairStartDate]);
  const dark = options.theme === 'dark';
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#ff6445">
      <Eyebrow color="#ff6445">Families — get ready!</Eyebrow>
      <p className="text-lg font-bold leading-tight mb-2 pr-16" style={font}>
        Our Book Fair is almost here
      </p>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-5xl font-extrabold leading-none" style={{ ...font, color: dark ? '#ffd41d' : '#02176f' }}>
          {days ?? '—'}
        </span>
        <span className="text-base font-bold mb-0.5" style={font}>
          {days === 1 ? 'day' : 'days'} to go · {rangeLabel(data.fairStartDate, data.fairEndDate)}
        </span>
      </div>
      <CtaButton url={data.familyUrl} label="Sign up & shop" accent="#ff6445" />
    </Frame>
  );
}

function GrantWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const dark = options.theme === 'dark';
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#6c47ff">
      <Eyebrow color="#6c47ff">Parents</Eyebrow>
      <p className="text-xl font-bold leading-tight mb-2 pr-16" style={font}>
        Grant a classroom wishlist
      </p>
      <p className="text-sm mb-3 pr-16" style={{ color: dark ? 'rgba(255,255,255,0.75)' : '#7e828f' }}>
        Browse your child&apos;s classroom wishlist and gift a book the teacher hand-picked.
      </p>
      <CtaButton url={data.familyUrl} label="Shop the wishlists" accent="#6c47ff" />
    </Frame>
  );
}

function SupportWidget({ data, options }: { data: WidgetData; options: WidgetOptions }) {
  const dark = options.theme === 'dark';
  const goal = data.goal || (data.prevSales ? Math.ceil(data.prevSales / 500) * 500 : 5000);
  const current = data.currentSales ?? 0;
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <Frame theme={options.theme} loupio={options.loupio} accent="#50db92">
      <Eyebrow color="#1a9d5f">Support {data.schoolName}</Eyebrow>
      <p className="text-xl font-bold leading-tight mb-3 pr-16" style={font}>
        Every book helps our school
      </p>
      <div className="h-3 rounded-full overflow-hidden mb-1.5" style={{ background: dark ? 'rgba(255,255,255,0.15)' : '#eef0f5' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#50db92' }} />
      </div>
      <p className="text-xs font-semibold mb-3" style={{ color: dark ? 'rgba(255,255,255,0.7)' : '#7e828f' }}>
        {money(current)} of {money(goal)} raised
      </p>
      <CtaButton url={data.familyUrl} label="Shop & support" accent="#50db92" />
    </Frame>
  );
}

// ---- Dispatcher + registry ----------------------------------------------

export function BookFairWidget({
  type,
  data,
  options,
}: {
  type: WidgetType;
  data: WidgetData;
  options: WidgetOptions;
}) {
  switch (type) {
    case 'countdown':
      return <CountdownWidget data={data} options={options} />;
    case 'goal':
      return <GoalWidget data={data} options={options} />;
    case 'teacher':
      return <InviteWidget data={data} options={options} variant="teacher" />;
    case 'family':
      return <InviteWidget data={data} options={options} variant="family" />;
    case 'signup':
      return <InviteWidget data={data} options={options} variant="signup" />;
    case 'leaderboard':
      return <LeaderboardWidget data={data} options={options} />;
    case 'family-countdown':
      return <FamilyCountdownWidget data={data} options={options} />;
    case 'grant':
      return <GrantWidget data={data} options={options} />;
    case 'support':
      return <SupportWidget data={data} options={options} />;
    default:
      return null;
  }
}

export type WidgetAudience = 'school' | 'families';

export const WIDGET_TYPES: { type: WidgetType; label: string; audience: WidgetAudience; icon: ReactNode }[] = [
  {
    type: 'countdown',
    label: 'Countdown', audience: 'school',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
    ),
  },
  {
    type: 'goal',
    label: 'Goal & sales', audience: 'school',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    type: 'teacher',
    label: 'Teacher invite', audience: 'school',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 1 8l11 5 9-4.09V14h2V8L12 3z" />
        <path d="M5 11v3.5c0 1.5 3 2.5 7 2.5s7-1 7-2.5V11" />
      </svg>
    ),
  },
  {
    type: 'family',
    label: 'Family invite', audience: 'families',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 14a4 4 0 0 1 5 4v2" />
      </svg>
    ),
  },
  {
    type: 'signup',
    label: 'Sign-up', audience: 'school',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    type: 'leaderboard',
    label: 'Wishlist leaderboard', audience: 'school',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4zM5 4H4a2 2 0 0 0 0 4h1M19 4h1a2 2 0 0 1 0 4h-1" />
      </svg>
    ),
  },
  {
    type: 'family-countdown',
    label: 'Family countdown',
    audience: 'families',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4" />
      </svg>
    ),
  },
  {
    type: 'grant',
    label: 'Grant a wishlist',
    audience: 'families',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    type: 'support',
    label: 'Support our school',
    audience: 'families',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    ),
  },
];
