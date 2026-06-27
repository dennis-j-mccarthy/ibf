'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import HeaderIcon from './HeaderIcon';

export interface InviteTreeClassroom {
  id: number;
  name: string;
  teacherName: string | null;
  teacherEmail: string | null;
  status: 'pending' | 'invited' | 'active';
  statusDetail: string | null;
  fullyActive: boolean;
  parentCount: number;
  activeParentCount: number;
  wishlistItemCount: number;
  createdAt: string | null; // ISO; used by the date-scope filter
}

export interface InviteTreeSummary {
  invited: number;
  active: number;
  pending: number;
  parentsJoined: number;
}

interface ParentEntry {
  parentProfileId: number;
  hasUser: boolean;
  tosAcceptedAt: string | null;
  studentNames: string[];
}

// The teacher's own status, mirroring the parent pill:
//   pending (not invited) → invited (link sent, no account)
//   → joined (account created) → active (signed in + accepted terms)
// State icons: grey when the milestone isn't met, colored when it is.
function AccountIcon({ active }: { active: boolean }) {
  return (
    <span
      title={active ? 'Has a store account' : 'No store account yet'}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
        active ? 'bg-[#50db92]/20 text-[#1c7c4d]' : 'bg-[#f3f3f3] text-[#c4c4c4]'
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function WishlistIcon({ items }: { items: number }) {
  const has = items > 0;
  return (
    <span
      title={has ? `Wishlist: ${items} book${items === 1 ? '' : 's'}` : 'Wishlist empty'}
      className={`inline-flex items-center justify-center w-6 h-6 ${has ? 'text-[#0088ff]' : 'text-[#c4c4c4]'}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M8 11h6M8 15h4" />
      </svg>
    </span>
  );
}

function ParentsIcon({ count }: { count: number }) {
  const has = count > 0;
  return (
    <span
      title={`${count} parent${count === 1 ? '' : 's'} joined`}
      className={`inline-flex items-center gap-1 ${has ? 'text-[#02176f]' : 'text-[#c4c4c4]'}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z" />
      </svg>
      <span className="text-sm font-semibold tabular-nums">{count}</span>
    </span>
  );
}

// Copies a classroom's family sign-up link, then shows a popover beside the
// button explaining what to do with it.
function CopyLinkButton({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 4000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={copy}
        title="Copy this classroom's family sign-up link"
        className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
          copied
            ? 'text-[#1c7c4d] bg-[#50db92]/15'
            : 'text-[#7e828f] hover:text-[#0088ff] hover:bg-[#f0f7ff]'
        }`}
      >
        {copied ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
          </svg>
        )}
      </button>
      {copied && (
        <span className="absolute bottom-full right-0 mb-2 z-50 w-60 bg-[#02176f] text-white text-xs font-medium px-3 py-2 rounded-lg shadow-xl flex items-start gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#50db92" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <path d="M5 13l4 4L19 7" />
          </svg>
          <span>{message}</span>
          <span className="absolute top-full right-3 -mt-px w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#02176f]" />
        </span>
      )}
    </span>
  );
}

// Opens the coordinator's own mail client with a friendly, pre-filled reminder
// to a teacher who hasn't finished signing up. (No server-side email needed.)
function reminderMailto(email: string | null, firstName: string | null, link: string): string {
  const subject = encodeURIComponent('Quick reminder: set up your book fair classroom');
  const body = encodeURIComponent(
    `Hi ${firstName || 'there'},\n\n` +
      `Our school book fair is coming up! When you have a moment, please register your ` +
      `classroom and start your wishlist here:\n\n${link}\n\n` +
      `It only takes a few minutes. Thank you!`
  );
  return `mailto:${email ?? ''}?subject=${subject}&body=${body}`;
}

function NudgeButton({
  email,
  firstName,
  link,
}: {
  email: string | null;
  firstName: string | null;
  link: string;
}) {
  return (
    <a
      href={reminderMailto(email, firstName, link)}
      title="Send a reminder email"
      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#ff6445] hover:bg-[#fff0ec] transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    </a>
  );
}

function WishlistStat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="bg-[#f8f9fc] border border-[#eef0f5] rounded-xl p-3 text-center">
      <div className="text-2xl font-bold text-[#02176f] tabular-nums" style={{ fontFamily: 'brother-1816, sans-serif' }}>
        {value}
      </div>
      <div className="text-[11px] text-[#7e828f] leading-tight mt-0.5">{label}</div>
      {sub && <div className="text-[11px] font-semibold text-[#0088ff] mt-0.5">{sub}</div>}
    </div>
  );
}

function ParentList({ classroomId }: { classroomId: number }) {
  const [parents, setParents] = useState<ParentEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/book-fair-admin/parents?classroomId=${classroomId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setParents(data.parents ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [classroomId]);

  if (parents === null && !error) {
    return <p className="text-sm text-[#7e828f] py-2 pl-9">Loading parents…</p>;
  }
  if (error) {
    return <p className="text-sm text-[#7e828f] py-2 pl-9">Couldn&apos;t load parents.</p>;
  }
  if (parents!.length === 0) {
    return <p className="text-sm text-[#7e828f] py-2 pl-9">No parents have joined yet.</p>;
  }
  return (
    <ul className="pl-9 py-1 space-y-1.5">
      {parents!.map((p) => (
        <li key={p.parentProfileId} className="text-sm text-[#1a1b1f]">
          Parent of {p.studentNames.join(', ')}
        </li>
      ))}
    </ul>
  );
}

const SCOPE_OPTIONS = [
  { months: 6, label: 'Last 6 months' },
  { months: 12, label: 'Last 12 months' },
  { months: 24, label: 'Last 24 months' },
  { months: 0, label: 'All time' },
];

export default function InviteTree({
  classrooms,
  schoolId,
  nowMs,
}: {
  classrooms: InviteTreeClassroom[];
  schoolId: number;
  nowMs: number; // server timestamp anchor for the date filter (no hydration drift)
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [scopeMonths, setScopeMonths] = useState(12);

  // Classrooms accumulate across fairs and aren't fair-scoped in the data, so
  // the coordinator picks a created-since window (default 12 months).
  const cutoff = useMemo(() => {
    if (!scopeMonths) return -Infinity;
    const d = new Date(nowMs);
    d.setMonth(d.getMonth() - scopeMonths);
    return d.getTime();
  }, [scopeMonths, nowMs]);
  const visible = classrooms.filter(
    (c) => !scopeMonths || (c.createdAt ? new Date(c.createdAt).getTime() >= cutoff : false)
  );

  // Summary + wishlist rollups recomputed from the visible set so they track
  // the chosen scope.
  const invited = visible.filter((c) => c.status === 'invited').length;
  const active = visible.filter((c) => c.status === 'active').length;
  const pending = visible.filter((c) => c.status === 'pending').length;
  const parentsJoined = visible.reduce((s, c) => s + c.parentCount, 0);
  const classroomsWithWishlist = visible.filter((c) => c.wishlistItemCount > 0).length;
  const totalBooks = visible.reduce((s, c) => s + c.wishlistItemCount, 0);
  const wishlistPct = visible.length
    ? Math.round((classroomsWithWishlist / visible.length) * 100)
    : 0;
  const avgBooks = classroomsWithWishlist ? Math.round(totalBooks / classroomsWithWishlist) : 0;

  // Teachers who haven't finished signing up — targets for a reminder nudge.
  const teacherSignupLink = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&role=teacher`;
  const unstartedEmails = visible
    .filter((c) => c.status !== 'active' && c.teacherEmail)
    .map((c) => c.teacherEmail as string);
  const bulkMailto = `mailto:?bcc=${unstartedEmails.join(',')}&${reminderMailto(null, null, teacherSignupLink).split('?')[1]}`;

  const toggle = (id: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-1.5">
        <h3
          className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          <HeaderIcon name="people" />
          Teacher and Parent Roster
        </h3>
        <select
          value={scopeMonths}
          onChange={(e) => setScopeMonths(Number(e.target.value))}
          className="text-sm text-[#02176f] font-medium bg-[#f5f6fa] border border-[#eef0f5] rounded-full pl-3 pr-7 py-1.5 cursor-pointer focus:outline-none focus:border-[#0088ff]"
        >
          {SCOPE_OPTIONS.map((o) => (
            <option key={o.months} value={o.months}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-[#7e828f] mb-6">
        {invited} teacher{invited === 1 ? '' : 's'} invited · {active} active · {pending} pending ·{' '}
        {parentsJoined} parent{parentsJoined === 1 ? '' : 's'} joined
        {scopeMonths ? (
          <span className="text-[#a0a4b0]">
            {' '}· showing {visible.length} of {classrooms.length} classrooms
          </span>
        ) : null}
      </p>

      {visible.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <WishlistStat
            value={`${classroomsWithWishlist}/${visible.length}`}
            label="classrooms have a wishlist"
            sub={`${wishlistPct}% started`}
          />
          <WishlistStat value={totalBooks.toLocaleString()} label="books wishlisted" />
          <WishlistStat value={avgBooks ? avgBooks.toLocaleString() : '0'} label="avg books per classroom" />
        </div>
      )}

      {unstartedEmails.length > 0 && (
        <div className="flex justify-end mb-4">
          <a
            href={bulkMailto}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#ff6445] hover:text-[#e55a3d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            Remind all unstarted ({unstartedEmails.length})
          </a>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-[#7e828f]">
          {classrooms.length === 0
            ? "No classrooms yet. They'll appear here once created for your school."
            : 'No classrooms created in this window — try a wider scope above.'}
        </p>
      ) : (
        <ul className="divide-y divide-[#f0f0f0]">
          {visible.map((c) => {
            const isOpen = open.has(c.id);
            const expandable = c.parentCount > 0;
            // NOTE: assumed classroom-link formula (schoolId + classroomId + role).
            // Adjust the param names here if the real classroom link differs.
            const classroomLink = `https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&classroomId=${c.id}&role=parent`;

            const toggleInner = (
              <>
                {expandable ? (
                  <span
                    className={`flex-shrink-0 text-[#7e828f] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-3" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="font-semibold text-[#1a1b1f] group-hover:text-[#02176f]">
                    {c.name}
                  </span>
                  {c.teacherEmail && (
                    <span className="block sm:inline sm:ml-2 text-sm text-[#7e828f] truncate">
                      {c.teacherEmail}
                    </span>
                  )}
                </span>
              </>
            );

            return (
              <li key={c.id} className="py-2">
                <div className="w-full flex items-center gap-3 py-1">
                  {expandable ? (
                    <button
                      onClick={() => toggle(c.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                      aria-expanded={isOpen}
                    >
                      {toggleInner}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 flex-1 min-w-0">{toggleInner}</div>
                  )}
                  <span className="flex items-center gap-3 flex-shrink-0">
                    <AccountIcon active={c.status === 'active'} />
                    <WishlistIcon items={c.wishlistItemCount} />
                    <ParentsIcon count={c.parentCount} />
                    {c.status !== 'active' && c.teacherEmail && (
                      <NudgeButton
                        email={c.teacherEmail}
                        firstName={c.teacherName?.split(' ')[0] ?? null}
                        link={`https://store.ignatiusbookfairs.com?signup=true&schoolId=${schoolId}&classroomId=${c.id}&role=teacher`}
                      />
                    )}
                    <CopyLinkButton
                      url={classroomLink}
                      message={`Share this link with your parents to invite them to ${
                        c.teacherName || c.name
                      }'s classroom!`}
                    />
                  </span>
                </div>
                {expandable && isOpen && <ParentList classroomId={c.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
