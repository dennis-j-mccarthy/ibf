'use client';

import { useEffect } from 'react';

type VersionMode = 'Catholic' | 'Public';

interface ModeOption {
  mode: VersionMode;
  label: string;
  short: string;
  blurb: string;
  accent: string;
}

const OPTIONS: ModeOption[] = [
  {
    mode: 'Catholic',
    label: 'Catholic Book Fairs',
    short: 'Catholic',
    blurb:
      'Book fairs built for the Catholic community — schools, parishes, and homeschool families.',
    accent: '#02176f',
  },
  {
    mode: 'Public',
    label: 'Public Book Fairs',
    short: 'Public',
    blurb:
      'Book fairs for public and independent schools — a wholesome, high-quality mainstream catalog with no religious content.',
    accent: '#0088ff',
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
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 sm:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-[#7e828f] hover:text-[#1a1b1f] transition cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2
          className="text-[#02176f] text-2xl font-bold pr-8"
          style={{ fontFamily: 'brother-1816, sans-serif', marginBottom: '20px' }}
        >
          Which book fair fits your community?
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {OPTIONS.map((o) => {
            const active = current === o.mode;
            return (
              <div key={o.mode} className="flex flex-col">
                <button
                  onClick={() => onChoose(o.mode)}
                  className="w-full rounded-lg px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 mb-5 cursor-pointer"
                  style={{ backgroundColor: o.accent }}
                >
                  View {o.short} version{active ? ' (Current)' : ''} &rarr;
                </button>
                <p className="text-[#1a1b1f] text-xs italic leading-relaxed w-3/4 mx-auto text-center">{o.blurb}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
