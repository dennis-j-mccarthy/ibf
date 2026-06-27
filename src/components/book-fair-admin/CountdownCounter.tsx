'use client';

import { useEffect, useState } from 'react';

function parts(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now());
  return {
    d: Math.floor(diff / 86_400_000),
    h: Math.floor((diff % 86_400_000) / 3_600_000),
    m: Math.floor((diff % 3_600_000) / 60_000),
    s: Math.floor((diff % 60_000) / 1000),
  };
}

// Live countdown to the fair start. `initialDays` is the server-computed day
// count so the first render matches on server + client (no hydration mismatch);
// the hours/min/sec tick in once mounted.
export default function CountdownCounter({
  targetIso,
  initialDays,
}: {
  targetIso: string;
  initialDays: number;
}) {
  const targetMs = new Date(targetIso.replace(' ', 'T')).getTime();
  const [t, setT] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const tick = () => setT(parts(targetMs));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  const cells: { label: string; value: string | number; big?: boolean }[] = [
    { label: 'Days', value: t ? t.d : initialDays, big: true },
    { label: 'Hrs', value: t ? String(t.h).padStart(2, '0') : '--' },
    { label: 'Min', value: t ? String(t.m).padStart(2, '0') : '--' },
    { label: 'Sec', value: t ? String(t.s).padStart(2, '0') : '--' },
  ];

  return (
    <div className="flex gap-2 sm:gap-3">
      {cells.map((c) => (
        <div
          key={c.label}
          className={`flex flex-col items-center justify-center rounded-lg bg-white/10 ${
            c.big ? 'px-4 py-2 min-w-[82px]' : 'px-3 py-2 min-w-[58px]'
          }`}
        >
          <span
            className={`font-bold tabular-nums leading-none ${
              c.big ? 'text-4xl sm:text-5xl text-[#ffd41d]' : 'text-xl sm:text-2xl text-white'
            }`}
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            {c.value}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-white/60 mt-1">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
