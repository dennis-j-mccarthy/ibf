'use client';

import { useEffect, useMemo, useState } from 'react';
import { FAIR_STATUS_STEPS } from '@/lib/book-fair-admin/fair-status';

// Serializable per-fair shape produced by the server component.
export type BoardFair = {
  key: number;
  schoolId: number | null;
  schoolName: string;
  location: string;
  dateRange: string;
  countdown: string;
  startMs: number;
  endMs: number;
  step: number | null; // 1..5, or null when the HubSpot stage is unknown
  stageLabel: string;
  typeLabel: string | null;
  hubspotMissing: boolean;
  bucket: 'week' | 'month' | 'later';
};

const STEP_STYLE: Record<number, { accent: string; pill: string }> = {
  1: { accent: '#0088ff', pill: 'bg-[#e6f2ff] text-[#02176f]' },
  2: { accent: '#f5a623', pill: 'bg-[#fff4e0] text-[#8a5a00]' },
  3: { accent: '#7b61ff', pill: 'bg-[#efeaff] text-[#4b2fb3]' },
  4: { accent: '#00c853', pill: 'bg-[#e3f9ec] text-[#0a7a3d]' },
  5: { accent: '#7e828f', pill: 'bg-[#eef0f3] text-[#4a4d57]' },
};
const UNKNOWN_STYLE = { accent: '#c7ccd4', pill: 'bg-[#eef0f3] text-[#7e828f]' };

const styleFor = (step: number | null) => (step ? STEP_STYLE[step] : UNKNOWN_STYLE);
const statusKey = (step: number | null): string => (step ? String(step) : 'unknown');

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LANES = 4; // stacked event rows per week before "+N more"

export default function FairsBoard({ fairs, nowMs }: { fairs: BoardFair[]; nowMs: number }) {
  const [view, setView] = useState<'list' | 'calendar'>('list');

  const hasUnknown = useMemo(() => fairs.some((f) => f.step === null), [fairs]);
  const allKeys = useMemo(
    () => ['1', '2', '3', '4', '5', ...(hasUnknown ? ['unknown'] : [])],
    [hasUnknown]
  );
  const [active, setActive] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(['1', '2', '3', '4', '5', 'unknown'].map((k) => [k, true]))
  );

  const filtered = useMemo(() => fairs.filter((f) => active[statusKey(f.step)]), [fairs, active]);

  const toggle = (k: string) => setActive((a) => ({ ...a, [k]: !a[k] }));
  const setAll = (val: boolean) =>
    setActive(Object.fromEntries(['1', '2', '3', '4', '5', 'unknown'].map((k) => [k, val])));
  const allOn = allKeys.every((k) => active[k]);

  // Fair whose HubSpot detail popup is open (click a school to open).
  const [detail, setDetail] = useState<BoardFair | null>(null);

  return (
    <div>
      {/* Controls: view toggle + status filter chips (chips double as the legend) */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600">
            {filtered.length} of {fairs.length} fair(s)
          </p>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
            {(['list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                  view === v ? 'bg-[#02176f] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {v === 'calendar' ? 'Calendar' : 'List'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAll(!allOn)}
            className="text-xs px-2.5 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium"
          >
            {allOn ? 'Clear all' : 'Select all'}
          </button>
          {([1, 2, 3, 4, 5] as const).map((s) => (
            <FilterChip
              key={s}
              label={FAIR_STATUS_STEPS[s - 1]}
              accent={STEP_STYLE[s].accent}
              on={active[String(s)]}
              onClick={() => toggle(String(s))}
            />
          ))}
          {hasUnknown && (
            <FilterChip
              label="Status unavailable"
              accent={UNKNOWN_STYLE.accent}
              on={active.unknown}
              onClick={() => toggle('unknown')}
            />
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          No fairs match the selected statuses.
        </div>
      ) : view === 'list' ? (
        <ListView fairs={filtered} onOpen={setDetail} />
      ) : (
        <CalendarView fairs={filtered} nowMs={nowMs} onOpen={setDetail} />
      )}

      {detail && <FairDetailModal fair={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function FilterChip({
  label,
  accent,
  on,
  onClick,
}: {
  label: string;
  accent: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
        on ? 'border-gray-300 bg-white text-gray-700' : 'border-gray-200 bg-gray-50 text-gray-400'
      }`}
    >
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: on ? accent : '#d5d8dd' }}
      />
      {label}
    </button>
  );
}

function monthKey(ms: number): { key: string; label: string } {
  const d = new Date(ms);
  return {
    key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

function ListView({ fairs, onOpen }: { fairs: BoardFair[]; onOpen: (f: BoardFair) => void }) {
  // Group by start month, chronological. fairs arrive sorted by start date.
  const months: { key: string; label: string; items: BoardFair[] }[] = [];
  const index = new Map<string, number>();
  for (const f of fairs) {
    const { key, label } = monthKey(f.startMs);
    let i = index.get(key);
    if (i === undefined) {
      i = months.length;
      index.set(key, i);
      months.push({ key, label, items: [] });
    }
    months[i].items.push(f);
  }

  return (
    <div className="space-y-3">
      {months.map((m, idx) => (
        <details
          key={m.key}
          open={idx === 0}
          className="group bg-white rounded-xl shadow-sm overflow-hidden"
        >
          <summary className="cursor-pointer select-none list-none px-5 py-3.5 flex items-center justify-between hover:bg-gray-50">
            <span className="font-brother text-[#02176f] text-base font-semibold">
              {m.label}{' '}
              <span className="text-gray-400 font-normal">({m.items.length})</span>
            </span>
            <svg
              className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-gray-100">
            {m.items.map((f) => {
              const style = styleFor(f.step);
              return (
                <div
                  key={f.key}
                  className="rounded-lg border border-gray-100 border-l-4 pl-4 pr-5 py-3 flex items-center justify-between gap-4"
                  style={{ borderLeftColor: style.accent }}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => onOpen(f)}
                        className="font-semibold text-[#02176f] truncate text-left hover:underline"
                      >
                        {f.schoolName}
                      </button>
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
                    {f.schoolId != null && (
                      <a
                        href={`/admin/fairs/view/${f.schoolId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-[#0066ff] hover:underline"
                      >
                        View dashboard ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}

// Calendar bar with a rich hover tooltip; click opens the detail popup.
function FairPill({ fair, onOpen }: { fair: BoardFair; onOpen: (f: BoardFair) => void }) {
  const style = styleFor(fair.step);
  return (
    <div className="group/pill relative">
      <button
        onClick={() => onOpen(fair)}
        className="w-full text-[10px] leading-tight truncate rounded px-1 py-0.5 text-white text-left cursor-pointer"
        style={{ backgroundColor: style.accent }}
      >
        {fair.schoolName}
      </button>
      {/* pt-1 (not mt-1) bridges the gap so the tooltip stays hoverable/clickable */}
      <div className="absolute z-30 left-0 top-full pt-1 hidden group-hover/pill:block w-56">
        <div className="rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-xl">
          <p className="font-semibold text-[#02176f] text-xs leading-snug">{fair.schoolName}</p>
          {fair.location && <p className="text-[11px] text-gray-500">{fair.location}</p>}
          <p className="text-[11px] text-gray-600 mt-1">{fair.dateRange}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: style.accent }} />
            <span className="text-[11px] text-gray-700">{fair.stageLabel}</span>
            <span className="text-[10px] text-gray-400">· {fair.countdown}</span>
          </div>
          {fair.typeLabel && <p className="text-[10px] text-gray-400 mt-0.5">{fair.typeLabel} book fair</p>}
          {fair.hubspotMissing && <p className="text-[10px] text-amber-600 mt-0.5">HubSpot unavailable</p>}
          {fair.schoolId != null && (
            <a
              href={`/admin/fairs/view/${fair.schoolId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066ff] hover:underline"
            >
              View coordinator dashboard ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarView({
  fairs,
  nowMs,
  onOpen,
}: {
  fairs: BoardFair[];
  nowMs: number;
  onOpen: (f: BoardFair) => void;
}) {
  // Start on the month of the earliest fair (calendars default to where the
  // data is, not an empty current month).
  const earliestMs = useMemo(
    () => fairs.reduce((m, f) => Math.min(m, f.startMs), Infinity),
    [fairs]
  );
  const [cursor, setCursor] = useState(() => {
    const d = new Date(isFinite(earliestMs) ? earliestMs : nowMs);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const shift = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const firstWeekday = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthStart = new Date(cursor.y, cursor.m, 1).getTime();
  const monthEnd = new Date(cursor.y, cursor.m + 1, 1).getTime();
  const monthFairs = fairs.filter((f) => f.startMs < monthEnd && f.endMs >= monthStart);

  const today = new Date(nowMs);
  const sameDay = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  // Real date for every grid cell (incl. leading/trailing days of adjacent
  // months) so multi-day fairs render as one continuous bar across days.
  const numCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const weeks: Date[][] = [];
  for (let i = 0; i < numCells; i += 7) {
    weeks.push(Array.from({ length: 7 }, (_, k) => new Date(cursor.y, cursor.m, 1 - firstWeekday + i + k)));
  }
  const covers = (f: BoardFair, d: Date) => {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return f.startMs < s + DAY_MS && f.endMs >= s;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-brother text-[#02176f] text-lg font-semibold">
          {monthLabel} <span className="text-gray-400 font-normal text-base">({monthFairs.length})</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCursor(() => ({ y: new Date(earliestMs).getFullYear(), m: new Date(earliestMs).getMonth() }))}
            className="text-xs px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
            disabled={!isFinite(earliestMs)}
          >
            Earliest fair
          </button>
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="w-8 h-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            ‹
          </button>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="w-8 h-8 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400 mb-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="border border-gray-100 rounded-lg">
        {weeks.map((week, wi) => {
          // Pack this week's fairs into non-overlapping lanes as continuous bars.
          const spans = monthFairs
            .map((f) => {
              const cols: number[] = [];
              week.forEach((d, ci) => covers(f, d) && cols.push(ci));
              return cols.length ? { fair: f, start: cols[0], end: cols[cols.length - 1] } : null;
            })
            .filter((b): b is { fair: BoardFair; start: number; end: number } => b !== null)
            .sort((a, b) => a.start - b.start || a.end - b.end);

          const laneEnd: number[] = [];
          const placed: { fair: BoardFair; start: number; end: number; lane: number }[] = [];
          let overflow = 0;
          for (const b of spans) {
            let lane = laneEnd.findIndex((e) => e < b.start);
            if (lane === -1) {
              if (laneEnd.length >= MAX_LANES) {
                overflow++;
                continue;
              }
              lane = laneEnd.length;
              laneEnd.push(b.end);
            } else {
              laneEnd[lane] = b.end;
            }
            placed.push({ ...b, lane });
          }

          return (
            <div
              key={wi}
              className={`min-h-[84px] ${wi > 0 ? 'border-t border-gray-100' : ''}`}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 'min-content' }}
            >
              {week.map((d, ci) => (
                <div
                  key={`n${ci}`}
                  style={{ gridColumn: ci + 1, gridRow: 1 }}
                  className={`px-1.5 pt-1 pb-1 ${ci > 0 ? 'border-l border-gray-50' : ''}`}
                >
                  <span
                    className={`text-[11px] font-medium inline-block px-1 rounded ${
                      sameDay(d)
                        ? 'bg-[#02176f] text-white'
                        : d.getMonth() === cursor.m
                          ? 'text-gray-600'
                          : 'text-gray-300'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                </div>
              ))}
              {placed.map((b) => (
                <div
                  key={b.fair.key}
                  style={{ gridColumn: `${b.start + 1} / ${b.end + 2}`, gridRow: b.lane + 2 }}
                  className="px-1 pb-0.5"
                >
                  <FairPill fair={b.fair} onOpen={onOpen} />
                </div>
              ))}
              {overflow > 0 && (
                <div
                  style={{ gridColumn: '1 / 8', gridRow: laneEnd.length + 2 }}
                  className="px-1.5 pb-1 text-[10px] text-gray-400"
                >
                  +{overflow} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type FairDetail = {
  identifier: string | null;
  companyName: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  fairType: string | null;
  studentsEnrolled: string | null;
  gradeLevels: string | null;
  aveAdminName: string | null;
  aveAdminEmail: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  hubspotUnavailable: boolean;
};

// Click-to-open popup: HubSpot Deal + Company fields for one fair.
function FairDetailModal({ fair, onClose }: { fair: BoardFair; onClose: () => void }) {
  const [data, setData] = useState<FairDetail | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading');

  useEffect(() => {
    let alive = true;
    setState('loading');
    fetch(`/api/admin/fair-detail?fairId=${fair.key}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: FairDetail) => alive && (setData(d), setState('ok')))
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [fair.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows: [string, string | null][] = data
    ? [
        ['Fair identifier', data.identifier],
        ['Company', data.companyName],
        ['Address', [data.street, data.city, data.state].filter(Boolean).join(', ') || null],
        ['Dates', fair.dateRange],
        ['Fair type', data.fairType],
        ['Students enrolled', data.studentsEnrolled],
        ['Grade levels', data.gradeLevels],
        ['Ave $ admin', data.aveAdminName],
        ['Ave $ admin email', data.aveAdminEmail],
        ['Organizer', data.organizerName],
        ['Organizer email', data.organizerEmail],
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-brother text-[#02176f] text-lg font-semibold truncate">{fair.schoolName}</h3>
            <p className="text-xs text-gray-500">
              {fair.dateRange}
              {fair.typeLabel ? ` · ${fair.typeLabel}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none -mt-1 shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3">
          {state === 'loading' && <p className="text-sm text-gray-500 py-4">Loading fair details…</p>}
          {state === 'error' && <p className="text-sm text-red-600 py-4">Couldn’t load fair details.</p>}
          {state === 'ok' && (
            <dl className="divide-y divide-gray-100">
              {rows.map(([label, val]) => (
                <div key={label} className="grid grid-cols-3 gap-3 py-2">
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="col-span-2 text-sm text-[#1a1b1f] break-words">
                    {val || <span className="text-gray-300">—</span>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-3">
          {data?.hubspotUnavailable && (
            <span className="text-[11px] text-amber-600">HubSpot data unavailable</span>
          )}
          {fair.schoolId != null && (
            <a
              href={`/admin/fairs/view/${fair.schoolId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm font-semibold text-white bg-[#02176f] hover:bg-[#021a85] px-4 py-2 rounded-md transition-colors"
            >
              View coordinator dashboard ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
