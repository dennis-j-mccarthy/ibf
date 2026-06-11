'use client';

import { useEffect, useState } from 'react';

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

const STATUS_BADGE: Record<InviteTreeClassroom['status'], { label: string; className: string }> = {
  pending: { label: 'Pending invite', className: 'bg-[#f5f5f5] text-[#7e828f] border-[#dddddd]' },
  invited: { label: 'Invited', className: 'bg-[#ffd41d]/20 text-[#8a6d00] border-[#ffd41d]' },
  active: { label: 'Active', className: 'bg-[#50db92]/20 text-[#1c7c4d] border-[#50db92]' },
};

function Badge({ status, detail }: { status: InviteTreeClassroom['status']; detail: string | null }) {
  const badge = STATUS_BADGE[status];
  const label = status === 'invited' && detail ? detail : badge.label;
  return (
    <span
      className={`inline-block text-xs font-semibold border rounded-full px-2.5 py-0.5 capitalize ${badge.className}`}
    >
      {label}
    </span>
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
        <li key={p.parentProfileId} className="flex items-center gap-2 text-sm">
          <span className="text-[#1a1b1f]">
            Parent of {p.studentNames.join(', ')}
          </span>
          <span
            className={`inline-block text-xs font-semibold border rounded-full px-2 py-0.5 ${
              p.tosAcceptedAt
                ? 'bg-[#50db92]/20 text-[#1c7c4d] border-[#50db92]'
                : 'bg-[#f5f5f5] text-[#7e828f] border-[#dddddd]'
            }`}
          >
            {p.tosAcceptedAt ? 'Active' : 'Joined'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function InviteTree({
  classrooms,
  summary,
}: {
  classrooms: InviteTreeClassroom[];
  summary: InviteTreeSummary;
}) {
  const [open, setOpen] = useState<Set<number>>(new Set());

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
      <h3
        className="text-[#02176f] text-xl font-semibold mb-1"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Teachers &amp; parents
      </h3>
      <p className="text-sm text-[#7e828f] mb-4">
        {summary.invited} teacher{summary.invited === 1 ? '' : 's'} invited · {summary.active} active ·{' '}
        {summary.pending} pending · {summary.parentsJoined} parent
        {summary.parentsJoined === 1 ? '' : 's'} joined
      </p>

      {classrooms.length === 0 ? (
        <p className="text-sm text-[#7e828f]">
          No classrooms yet. Classrooms appear here once they&apos;re created for your school.
        </p>
      ) : (
        <ul className="divide-y divide-[#f0f0f0]">
          {classrooms.map((c) => {
            const isOpen = open.has(c.id);
            return (
              <li key={c.id} className="py-2">
                <button
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-3 text-left py-1 group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`flex-shrink-0 text-[#7e828f] transition-transform ${isOpen ? 'rotate-90' : ''}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-[#1a1b1f] group-hover:text-[#02176f]">
                      {c.name}
                    </span>
                    {(c.teacherName || c.teacherEmail) && (
                      <span className="block sm:inline sm:ml-2 text-sm text-[#7e828f] truncate">
                        {c.teacherName}
                        {c.teacherName && c.teacherEmail ? ' · ' : ''}
                        {c.teacherEmail}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 flex-shrink-0">
                    <Badge status={c.status} detail={c.statusDetail} />
                    {c.fullyActive && (
                      <span title="Signed in and accepted terms" className="text-[#50db92]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="6" />
                        </svg>
                      </span>
                    )}
                    <span className="text-xs text-[#7e828f] whitespace-nowrap hidden sm:inline">
                      {c.activeParentCount}/{c.parentCount} parents
                    </span>
                  </span>
                </button>
                {isOpen && <ParentList classroomId={c.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
