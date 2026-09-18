'use client';

import { useMemo, useState } from 'react';
import { OUR_TAKES } from '@/data/ourTake';

// Browse and export the "Our Take" editorial blurbs -- one per store product,
// honestly labeled as the store's own voice (not customer reviews).

export default function OurTakeBrowser() {
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return OUR_TAKES;
    return OUR_TAKES.filter(
      (t) => t.title.toLowerCase().includes(needle) || t.take.toLowerCase().includes(needle)
    );
  }, [q]);

  const downloadCsv = () => {
    const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
    const lines = ['product_id,book_title,product_url,our_take'];
    for (const t of visible) {
      lines.push([t.id, t.title, t.url, t.take].map(esc).join(','));
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = q.trim()
      ? `our-take-filtered-${visible.length}.csv`
      : `our-take-full-catalog-${OUR_TAKES.length}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold">Our Take Reviews</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
            Back to admin
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <p className="text-sm text-gray-600 mb-5">
          One editorial blurb per store product, written in IBF&apos;s own voice — {OUR_TAKES.length.toLocaleString()} in
          all. These are labeled as our recommendations, not customer reviews.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles and takes…"
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm w-72"
          />
          <span className="text-sm text-gray-500">{visible.length.toLocaleString()} shown</span>
          <button
            onClick={downloadCsv}
            className="ml-auto bg-[#0088ff] hover:bg-[#0077e0] text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ⬇ Download CSV{q.trim() ? ' (filtered)' : ''}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {visible.slice(0, 400).map((t) => (
            <div key={t.id} className="px-4 py-3">
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#02176f] hover:underline"
              >
                {t.title}
              </a>
              <p className="text-sm text-[#3a3f4b] mt-0.5">
                <span className="font-bold">Our Take:</span> {t.take}
              </p>
            </div>
          ))}
          {visible.length > 400 && (
            <p className="px-4 py-3 text-sm text-gray-500">
              Showing the first 400 — refine the search or use the CSV for the full set.
            </p>
          )}
          {visible.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No matches.</p>}
        </div>
      </main>
    </div>
  );
}
