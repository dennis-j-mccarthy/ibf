'use client';

import { useMemo, useState } from 'react';
import type { StoreReview } from '@/data/storeReviews';
import type { OurTake } from '@/data/ourTake';

// Two tabs: real customer reviews from the store (snapshot), and the
// generated "Our Take" editorial blurbs. Each tab has its own CSV export.

function csvDownload(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines = [header.join(','), ...rows.map((r) => r.map(esc).join(','))];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ReviewsBrowser({ reviews, takes }: { reviews: StoreReview[]; takes: OurTake[] }) {
  const [tab, setTab] = useState<'store' | 'takes'>('store');
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();

  const visReviews = useMemo(
    () =>
      needle
        ? reviews.filter((r) =>
            `${r.product} ${r.title} ${r.text} ${r.reviewer}`.toLowerCase().includes(needle)
          )
        : reviews,
    [reviews, needle]
  );
  const visTakes = useMemo(
    () =>
      needle
        ? takes.filter((t) => `${t.title} ${t.take}`.toLowerCase().includes(needle))
        : takes,
    [takes, needle]
  );

  const download = () => {
    if (tab === 'store') {
      csvDownload(
        `store-reviews-${visReviews.length}.csv`,
        ['product_id', 'product', 'rating', 'title', 'text', 'reviewer', 'email', 'status', 'date'],
        visReviews.map((r) => [r.productId, r.product, r.rating, r.title, r.text, r.reviewer, r.email, r.status, r.date])
      );
    } else {
      csvDownload(
        `our-take-${visTakes.length}.csv`,
        ['product_id', 'book_title', 'product_url', 'our_take'],
        visTakes.map((t) => [t.id, t.title, t.url, t.take])
      );
    }
  };

  const tabBtn = (key: 'store' | 'takes', label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
        tab === key ? 'bg-[#02176f] text-white' : 'bg-white text-[#7e828f] hover:text-[#02176f]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold">Reviews</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
            Back to admin
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {tabBtn('store', `Store reviews (${reviews.length})`)}
          {tabBtn('takes', `Our Take — generated (${takes.length.toLocaleString()})`)}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm w-60"
          />
          <button
            onClick={download}
            className="ml-auto bg-[#0088ff] hover:bg-[#0077e0] text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            ⬇ Download CSV ({tab === 'store' ? visReviews.length : visTakes.length.toLocaleString()})
          </button>
        </div>

        {tab === 'store' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#7e828f] border-b border-gray-100">
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Rating</th>
                  <th className="px-4 py-2.5">Review</th>
                  <th className="px-4 py-2.5">Reviewer</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 whitespace-nowrap">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visReviews.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-semibold text-[#02176f] min-w-[160px]">{r.product}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[#c9691d]">
                      {'★'.repeat(r.rating)}
                      <span className="text-gray-300">{'★'.repeat(Math.max(0, 5 - r.rating))}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[#3a3f4b] min-w-[260px]">
                      {r.title && <span className="font-semibold">{r.title} — </span>}
                      {r.text}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{r.reviewer}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                          r.status === 'approved' ? 'bg-[#e7f3e7] text-[#0e8a5f]' : 'bg-[#fff7e6] text-[#6b5310]'
                        }`}
                      >
                        {r.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">{r.date}</td>
                  </tr>
                ))}
                {visReviews.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-gray-500">
                      No matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {visTakes.slice(0, 400).map((t) => (
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
            {visTakes.length > 400 && (
              <p className="px-4 py-3 text-sm text-gray-500">
                Showing the first 400 — refine the search or use the CSV for the full set.
              </p>
            )}
            {visTakes.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No matches.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
