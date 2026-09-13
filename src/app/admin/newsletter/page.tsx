import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Newsletter Signups | IBF Admin',
  robots: { index: false, follow: false },
};

// Staff-accessible (middleware deny-list leaves /admin/newsletter open, same
// posture as the email audit). Shows popup signups + simple stats and links to
// the CSV export.
export default async function NewsletterAdmin() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  let rows: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    source: string;
    path: string;
    createdAt: Date;
  }[] = [];
  let tableMissing = false;
  try {
    rows = await prisma.newsletterSignup.findMany({ orderBy: { createdAt: 'desc' } });
  } catch (err) {
    if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2021') {
      tableMissing = true;
    } else {
      throw err;
    }
  }

  const inLast = (days: number) => rows.filter((r) => now - r.createdAt.getTime() < days * day).length;
  const bySource = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const r of rows) {
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
    const p = r.path || '/';
    byPath.set(p, (byPath.get(p) ?? 0) + 1);
  }
  const topPaths = [...byPath.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const font = { fontFamily: 'brother-1816, sans-serif' } as const;

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={font}>
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold">Newsletter Signups</h1>
          <div className="flex items-center gap-2">
            <a
              href="/api/admin/newsletter/export"
              className="text-sm bg-white text-[#02176f] font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors"
            >
              Export CSV
            </a>
            <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
              Back to admin
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {tableMissing ? (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <p className="text-[#02176f] font-bold mb-1">Database table missing</p>
            <p className="text-sm text-gray-600">
              The NewsletterSignup table has not been pushed yet. Run the db push, then reload.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { n: rows.length, l: 'total signups' },
                { n: inLast(7), l: 'last 7 days' },
                { n: inLast(30), l: 'last 30 days' },
                { n: bySource.get('popup') ?? 0, l: 'from the popup' },
              ].map((s) => (
                <div key={s.l} className="bg-white rounded-xl shadow-sm px-4 py-3">
                  <p className="text-2xl font-bold text-[#02176f] tabular-nums">{s.n.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{s.l}</p>
                </div>
              ))}
            </div>

            {topPaths.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <p className="text-xs font-bold uppercase tracking-wide text-[#7e828f] mb-2">
                  Where people sign up
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#3a3f4b]">
                  {topPaths.map(([p, n]) => (
                    <span key={p}>
                      <span className="font-mono text-xs">{p}</span>{' '}
                      <span className="text-gray-400">×{n}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {rows.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                No signups yet — the popup is live on the site, so they&apos;ll appear here.
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[#7e828f] border-b border-gray-100">
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Source</th>
                      <th className="px-4 py-2.5">Page</th>
                      <th className="px-4 py-2.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 500).map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 font-semibold text-[#02176f] whitespace-nowrap">
                          {`${r.firstName} ${r.lastName}`.trim() || '—'}
                        </td>
                        <td className="px-4 py-2">{r.email}</td>
                        <td className="px-4 py-2 text-gray-500">{r.source}</td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-500">{r.path || '/'}</td>
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                          {r.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 500 && (
                  <p className="px-4 py-2 text-xs text-gray-400">
                    Showing the latest 500 — use Export CSV for everything.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
