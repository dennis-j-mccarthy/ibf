'use client';

import { useEffect, useState } from 'react';
import type { Resource } from '@prisma/client';
import { CALENDAR_ITEMS_BY_TYPE } from '@/lib/book-fair-admin/checklist-items';
import ResourceModal from './ResourceModal';
import HeaderIcon from './HeaderIcon';

export type TaxCertStatus = 'complete' | 'missing' | 'unavailable';

type Phase = 'Pre-fair' | 'During the fair' | 'After the fair';
type View = 'list' | 'calendar';

interface Item {
  id: string;
  label: string;
  phase: Phase;
  auto?: boolean; // data-driven (not manually toggleable)
  resourceSlug?: string;
  link?: string; // a "set up" link shown when the auto item isn't done yet
  daysFromFair?: number; // offset from fair start date (calendar-derived items)
}

const AFTER_ITEMS: Item[] = [
  { id: 'pack', label: 'Pack up & schedule pickup', phase: 'After the fair' },
  { id: 'returns', label: 'Submit returns & reconcile', phase: 'After the fair' },
  { id: 'thanks', label: 'Thank teachers, families & volunteers', phase: 'After the fair' },
  { id: 'notes', label: 'Record notes for next year', phase: 'After the fair' },
];

const PHASES: Phase[] = ['Pre-fair', 'During the fair', 'After the fair'];

// Colored date pills, tinted per phase (Pre-fair blue, During amber, After green).
const PILL_COLORS: Record<Phase, string> = {
  'Pre-fair': 'bg-[#e8f3ff] text-[#0066cc]',
  'During the fair': 'bg-[#fff4d6] text-[#9a7400]',
  'After the fair': 'bg-[#e6f9f0] text-[#1a9d5f]',
};

// The same celebratory star used on fair day in the planning calendar.
function PhaseStar() {
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 ml-2">
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="#ffc107"
        stroke="#ff6445"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="origin-center drop-shadow-sm animate-[star-pulse_1.6s_ease-in-out_infinite]"
      >
        <path d="M12 2.5l2.74 5.93 6.51.86-4.8 4.46 1.23 6.43L12 17.97l-5.68 2.21 1.23-6.43-4.8-4.46 6.51-.86L12 2.5z" />
      </svg>
    </span>
  );
}

function itemDateLabel(fairStartDate: string, daysFromFair: number): string {
  const d = new Date(`${fairStartDate}T00:00:00`);
  d.setDate(d.getDate() + daysFromFair);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PrepChecklist({
  schoolId,
  fairType,
  autoDone,
  taxCertMissing = false,
  resourcesBySlug = {},
  adminSignupUrl,
  fairStartDate,
  view,
  onViewChange,
  calendar,
}: {
  schoolId: number;
  fairType: string;
  autoDone: Record<string, boolean>;
  taxCertMissing?: boolean;
  resourcesBySlug?: Record<string, Resource>;
  adminSignupUrl?: string;
  fairStartDate?: string;
  view: View;
  onViewChange: (v: View) => void;
  calendar: React.ReactNode;
}) {
  const storageKey = `bfa-checklist-${schoolId}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [modalResource, setModalResource] = useState<Resource | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // Universal auto items first (admin account is the foundational step).
  const autoItems: Item[] = [
    { id: 'admin', label: 'Create your admin account', phase: 'Pre-fair', auto: true, link: adminSignupUrl },
    { id: 'tax', label: 'Confirm tax-exempt status', phase: 'Pre-fair', auto: true },
    { id: 'taxupload', label: 'Upload your tax-exempt certificate', phase: 'Pre-fair' },
    { id: 'invite', label: 'Invite all your teachers', phase: 'Pre-fair', auto: true },
    { id: 'signup', label: 'Get teachers signed up & building wishlists', phase: 'Pre-fair', auto: true },
  ];
  // Calendar items for this fair type (fall back to catholic-in-person); drop the
  // calendar's own admin-account step, surfaced as the auto item above.
  const calendarItems: Item[] = (
    CALENDAR_ITEMS_BY_TYPE[fairType] ?? CALENDAR_ITEMS_BY_TYPE['catholic-in-person']
  ).filter((i) => i.id !== 'admin-account');
  const allItems = [...autoItems, ...calendarItems, ...AFTER_ITEMS];
  const visibleItems = allItems.filter((i) => i.id !== 'taxupload' || taxCertMissing);

  const isDone = (item: Item) => (item.auto ? !!autoDone[item.id] : !!checked[item.id]);
  const total = visibleItems.length;
  const doneCount = visibleItems.filter(isDone).length;

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      {/* Header: title left, List / Calendar switcher top-right */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3
          className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold leading-tight"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          <HeaderIcon name="checklist" />
          Fair Checklist and Timeline
        </h3>
        <div className="inline-flex bg-[#f5f6fa] rounded-full p-1 flex-shrink-0">
          <ViewTab active={view === 'list'} onClick={() => onViewChange('list')} label="List view" icon={<ListIcon />} />
          <ViewTab active={view === 'calendar'} onClick={() => onViewChange('calendar')} label="Calendar view" icon={<CalendarIcon />} />
        </div>
      </div>

      {view === 'list' ? (
        <>
          <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-[#50db92] rounded-full transition-all"
              style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
            {PHASES.map((phase) => {
              const phaseItems = visibleItems.filter((i) => i.phase === phase);
              if (phaseItems.length === 0) return null;
              return (
                <div key={phase}>
                  <h4 className="flex items-center text-xs font-semibold uppercase tracking-wide text-[#7e828f] mb-2">
                    {phase}
                    {phase === 'During the fair' && <PhaseStar />}
                  </h4>
                  <ul className="space-y-0.5">
                    {phaseItems.map((item) => {
                      const done = isDone(item);
                      const interactive = !item.auto;
                      const resource = item.resourceSlug ? resourcesBySlug[item.resourceSlug] : undefined;
                      const dateLabel =
                        fairStartDate && item.daysFromFair !== undefined
                          ? itemDateLabel(fairStartDate, item.daysFromFair)
                          : null;
                      return (
                        <li key={item.id} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[#f7f9fc]">
                          <button
                            type="button"
                            onClick={() => interactive && toggle(item.id)}
                            disabled={!interactive}
                            aria-label={done ? 'Mark not done' : 'Mark done'}
                            className={`flex-shrink-0 ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center ${
                                done ? 'bg-[#50db92] text-white' : 'border-2 border-[#d5d5d5] text-transparent'
                              }`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                          </button>

                          {resource ? (
                            <button
                              type="button"
                              onClick={() => setModalResource(resource)}
                              className={`flex-1 min-w-0 text-left text-sm ${
                                done
                                  ? 'text-[#7e828f] line-through'
                                  : 'text-[#0088ff] hover:text-[#0066cc]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ) : interactive ? (
                            <button
                              type="button"
                              onClick={() => toggle(item.id)}
                              className={`flex-1 min-w-0 text-left text-sm ${
                                done ? 'text-[#7e828f] line-through' : 'text-[#1a1b1f]'
                              }`}
                            >
                              {item.label}
                            </button>
                          ) : (
                            <span
                              className={`flex-1 min-w-0 text-sm ${
                                done ? 'text-[#7e828f] line-through' : 'text-[#1a1b1f]'
                              }`}
                            >
                              {item.label}
                            </span>
                          )}

                          {item.link && !done && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 text-xs font-semibold text-[#0088ff] hover:underline whitespace-nowrap"
                            >
                              Set up →
                            </a>
                          )}
                          {item.auto && (done || !item.link) && (
                            <span className="flex-shrink-0 text-[10px] uppercase tracking-wide text-[#b8b8b8]">
                              auto
                            </span>
                          )}
                          {dateLabel && (
                            <span
                              className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${PILL_COLORS[item.phase]}`}
                            >
                              {dateLabel}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
            <span className="text-sm text-[#7e828f]">
              {doneCount}/{total} done
            </span>
          </div>
        </>
      ) : (
        <div className="mt-1 -mx-6 -mb-6 border-t border-[#ececf1] overflow-hidden rounded-b-xl">
          {calendar}
        </div>
      )}

      {modalResource && (
        <ResourceModal resource={modalResource} onClose={() => setModalResource(null)} />
      )}
    </section>
  );
}

function ViewTab({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active ? 'bg-[#0088ff] text-white shadow-sm' : 'text-[#7e828f] hover:text-[#02176f]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="3.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}
