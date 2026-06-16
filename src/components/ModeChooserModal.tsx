'use client';

import { useEffect } from 'react';

type VersionMode = 'Catholic' | 'Public';

interface ModeOption {
  mode: VersionMode;
  label: string;
  short: string;
  tag?: string;
  blurb: string;
  why: string;
  accent: string;
  bg: string;
}

const OPTIONS: ModeOption[] = [
  {
    mode: 'Catholic',
    label: 'Catholic Book Fairs',
    short: 'Catholic',
    tag: 'Default',
    blurb:
      'Book fairs built for the Catholic community — schools, parishes, and homeschool families. A hand-curated catalog of faith-filled stories, the lives of the saints, and virtue-building favorites, right alongside the best of mainstream children’s literature.',
    why: 'Best if your community is a Catholic school, parish, or homeschool co-op and you want a fair that reflects your faith.',
    accent: '#02176f',
    bg: '#fff8d6',
  },
  {
    mode: 'Public',
    label: 'Public Book Fairs',
    short: 'Public',
    blurb:
      'Book fairs for public and independent schools — a wholesome, high-quality mainstream catalog with no religious content. All the excitement of a classic book fair, with titles families and educators can feel good about.',
    why: 'Best for public schools, libraries, and secular organizations.',
    accent: '#0088ff',
    bg: '#eaf5ff',
  },
];

export default function ModeChooserModal({
  current,
  onChoose,
  onClose,
}: {
  current: VersionMode;
  onChoose: (mode: VersionMode) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-[#02176f] text-2xl font-bold mb-1"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Which book fair fits your community?
        </h2>
        <p className="text-[#7e828f] text-sm mb-6">
          Pick a version to preview the site the way that audience sees it. You can switch any time.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {OPTIONS.map((o) => {
            const active = current === o.mode;
            return (
              <button
                key={o.mode}
                onClick={() => onChoose(o.mode)}
                className="text-left rounded-xl border-2 p-5 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ borderColor: o.accent, backgroundColor: o.bg }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="font-bold text-lg"
                    style={{ fontFamily: 'brother-1816, sans-serif', color: o.accent }}
                  >
                    {o.label}
                  </span>
                  {o.tag && (
                    <span
                      className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: o.accent }}
                    >
                      {o.tag}
                    </span>
                  )}
                  {active && (
                    <span className="text-[10px] uppercase tracking-wide text-[#7e828f] ml-auto">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[#1a1b1f] text-sm mb-3 leading-snug">{o.blurb}</p>
                <p className="text-[#7e828f] text-xs leading-snug">{o.why}</p>
                <span
                  className="inline-block mt-4 text-sm font-bold"
                  style={{ color: o.accent }}
                >
                  View {o.short} version &rarr;
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-6 text-sm text-[#7e828f] hover:text-[#1a1b1f]"
        >
          Close
        </button>
      </div>
    </div>
  );
}
