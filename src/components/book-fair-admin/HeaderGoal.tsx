'use client';

import { useEffect, useState } from 'react';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// Dark-header variant of the fundraising goal ring, sized to sit beside the
// countdown with equal visual weight. Goal is set by the coordinator and saved
// locally; progress is the current fair's sales (which post during/after).
export default function HeaderGoal({
  schoolId,
  currentSales,
  lastFairSales,
}: {
  schoolId: number;
  currentSales: number | null;
  lastFairSales: number | null;
}) {
  const key = `bfa-goal-${schoolId}`;
  const [goal, setGoal] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  // Preview hook: ?goalpct=50 forces the ring to a given completion %.
  const [previewPct, setPreviewPct] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setGoal(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    const p = new URLSearchParams(window.location.search).get('goalpct');
    if (p !== null && p !== '') setPreviewPct(Math.max(0, Math.min(100, Number(p))));
  }, [key]);

  const suggested = lastFairSales ? Math.ceil(lastFairSales / 500) * 500 : 5000;
  const effectiveGoal = goal ?? suggested;
  const current = previewPct != null ? (previewPct / 100) * effectiveGoal : currentSales ?? 0;
  const pct = effectiveGoal > 0 ? Math.min(100, (current / effectiveGoal) * 100) : 0;

  const save = () => {
    const n = Math.round(Number(draft.replace(/[^0-9.]/g, '')));
    if (n > 0) {
      setGoal(n);
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* ignore */
      }
    }
    setEditing(false);
  };

  const R = 40;
  const C = 2 * Math.PI * R;

  return (
    <div className="rounded-xl bg-white/5 p-4 h-full">
      <p className="text-white/60 uppercase text-xs tracking-wide mb-2">Fair goal</p>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
            <circle
              cx="48"
              cy="48"
              r={R}
              fill="none"
              stroke="#ffd41d"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (pct / 100) * C}
              transform="rotate(-90 48 48)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tabular-nums text-white" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums leading-tight" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            {money(current)}
            <span className="text-sm font-medium text-white/60"> of {money(effectiveGoal)}</span>
          </p>
          {lastFairSales != null ? (
            <p className="text-xs text-white/50 mt-0.5">Last fair: {money(lastFairSales)}</p>
          ) : currentSales === null ? (
            <p className="text-xs text-white/50 mt-0.5">Sales post during your fair.</p>
          ) : null}
          {editing ? (
            <span className="inline-flex items-center gap-1 mt-1 text-sm">
              <span className="text-white/60">$</span>
              <input
                autoFocus
                inputMode="numeric"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && save()}
                placeholder={String(effectiveGoal)}
                className="w-20 bg-white/10 border border-white/20 rounded px-2 py-0.5 text-white text-sm focus:outline-none focus:border-[#7fc4ff]"
              />
              <button onClick={save} className="font-semibold text-[#7fc4ff] hover:underline">
                Save
              </button>
            </span>
          ) : (
            <button
              onClick={() => {
                setDraft(String(goal ?? suggested));
                setEditing(true);
              }}
              className="mt-1 text-sm font-semibold text-[#7fc4ff] hover:underline"
            >
              {goal == null ? 'Set goal' : 'Edit goal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
