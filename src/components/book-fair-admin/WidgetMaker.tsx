'use client';

import { useEffect, useState } from 'react';
import HeaderIcon from './HeaderIcon';
import { BookFairWidget, WIDGET_TYPES, type WidgetData, type WidgetType } from './widgets';

// Default iframe height per widget so the embed code fits without scrollbars.
const HEIGHTS: Record<WidgetType, number> = {
  countdown: 200,
  goal: 230,
  teacher: 250,
  family: 250,
  signup: 250,
  leaderboard: 300,
};

export default function WidgetMaker({
  schoolId,
  origin: originProp,
  data,
}: {
  schoolId: number;
  origin: string;
  data: WidgetData;
}) {
  const [type, setType] = useState<WidgetType>('countdown');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [loupio, setLoupio] = useState(true);
  const [copied, setCopied] = useState(false);
  // Use the live origin so the embed code points at wherever this is viewed.
  const [origin, setOrigin] = useState(originProp);
  useEffect(() => {
    if (window.location.origin) setOrigin(window.location.origin);
  }, []);

  const params = new URLSearchParams({ schoolId: String(schoolId), theme });
  if (!loupio) params.set('loupio', '0');
  const src = `${origin}/bookfair-widget/${type}?${params.toString()}`;
  const embed = `<iframe src="${src}" width="340" height="${HEIGHTS[type]}" style="border:0;overflow:hidden;max-width:100%" loading="lazy" title="Book Fair widget"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embed);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold mb-1"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        <HeaderIcon name="widgets" />
        Website widgets
      </h3>
      <p className="text-sm text-[#7e828f] mb-5">
        Pick a widget, customize it, and paste the code onto your school website.
      </p>

      {/* Widget type chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {WIDGET_TYPES.map((w) => {
          const active = w.type === type;
          return (
            <button
              key={w.type}
              type="button"
              onClick={() => setType(w.type)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                active
                  ? 'bg-[#02176f] text-white'
                  : 'bg-[#f5f6fa] text-[#7e828f] hover:text-[#02176f] hover:bg-[#eef0f5]'
              }`}
            >
              {w.icon}
              {w.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Live preview */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-2">Live preview</p>
          <div className="rounded-xl bg-[#eef1f6] p-6 flex items-center justify-center min-h-[260px]">
            <div className="w-full max-w-[340px]">
              <BookFairWidget type={type} data={data} options={{ theme, loupio }} />
            </div>
          </div>
        </div>

        {/* Options + embed code */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-2">Customize</p>
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1a1b1f] font-medium">Theme</span>
              <div className="inline-flex bg-[#f5f6fa] rounded-full p-1">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTheme(t)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                      theme === t ? 'bg-[#0088ff] text-white' : 'text-[#7e828f]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#1a1b1f] font-medium">Show Loupio</span>
              <button
                type="button"
                onClick={() => setLoupio((v) => !v)}
                aria-pressed={loupio}
                className={`relative w-11 h-6 rounded-full transition-colors ${loupio ? 'bg-[#50db92]' : 'bg-[#d5d5d5]'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${loupio ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-2">Embed code</p>
          <textarea
            readOnly
            value={embed}
            onFocus={(e) => e.currentTarget.select()}
            rows={4}
            className="w-full text-xs font-mono text-[#3a3f4b] bg-[#f7f9fc] border border-[#eef0f5] rounded-lg p-3 resize-none focus:outline-none focus:border-[#0088ff]"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={copy}
              className="bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
            >
              {copied ? 'Copied!' : 'Copy embed code'}
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#0088ff] hover:underline"
            >
              Open preview ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
