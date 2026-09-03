'use client';

import { useCallback, useEffect, useState } from 'react';

type LinkRow = { url: string; source: string; text: string; status: string; httpStatus: number | null };

type Message = {
  key: string;
  phase: string | null;
  offset: number | null;
  title: string;
  subject: string;
  reps: string[];
  copies: { hubspotId: string; name: string; rep: string | null }[];
  variantsDiffer: boolean;
  links: LinkRow[];
  previewId: string;
};

type View = {
  runAt: string;
  totals: {
    emails: number;
    flows: number;
    flowsEnabled: number;
    sequenceEmails: number;
    distinctMessages: number;
    repDuplicated: number;
    brokenLinks: number;
  };
  sections: { title: string; messages: Message[] }[];
  unmatchedSequenced: Message[];
  other: Message[];
};

type Progress = {
  phase?: string;
  totalEmails: number;
  detailsFetched: number;
  totalLinks: number;
  checkedLinks: number;
};

type Block =
  | { type: 'html'; html: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'cta'; text: string; url: string };

const brokenLinks = (m: Message) => m.links.filter((l) => l.status === 'broken');

// "VF Fair -15" renders as a countdown stamp like "VF FAIR −15".
function stamp(m: Message): string {
  if (!m.phase) return '';
  const off = m.offset == null ? '' : ` ${m.offset > 0 ? `+${m.offset}` : m.offset === 0 ? '±0' : m.offset}`;
  return `${m.phase.toUpperCase()}${off}`;
}

export default function EmailAudit() {
  const [loading, setLoading] = useState(true);
  const [setupState, setSetupState] = useState<string | null>(null);
  const [tokenConfigured, setTokenConfigured] = useState(true);
  const [view, setView] = useState<View | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [runError, setRunError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyBroken, setOnlyBroken] = useState(false);
  const [onlyDuplicated, setOnlyDuplicated] = useState(false);
  const [modal, setModal] = useState<Message | null>(null);
  const [modalBlocks, setModalBlocks] = useState<Block[] | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/email-audit')
      .then((r) => r.json())
      .then((d) => {
        setSetupState(d.setup ?? null);
        setTokenConfigured(Boolean(d.tokenConfigured));
        setView(d.view ?? null);
        if (d.active) setProgress(d.active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-run: create the run, then drive it step by step. Each step is one
  // bounded server slice; the page is the scheduler, so a closed tab simply
  // pauses the run (a later re-run resumes or restarts it).
  const rerun = async () => {
    setRunError('');
    const start = await fetch('/api/admin/email-audit/run', { method: 'POST' });
    const started = await start.json().catch(() => ({}));
    if (!start.ok) {
      setRunError(started.error ?? 'Could not start the audit.');
      return;
    }
    setProgress({ totalEmails: 0, detailsFetched: 0, totalLinks: 0, checkedLinks: 0 });
    for (;;) {
      const res = await fetch('/api/admin/email-audit/step', { method: 'POST' });
      if (!res.ok) {
        setRunError('Audit step failed; re-run to resume.');
        break;
      }
      const s = await res.json();
      setProgress({
        phase: s.phase,
        totalEmails: s.totalEmails ?? 0,
        detailsFetched: s.detailsFetched ?? 0,
        totalLinks: s.totalLinks ?? 0,
        checkedLinks: s.checkedLinks ?? 0,
      });
      if (s.done) {
        if (s.failed) setRunError(`Audit failed: ${s.error ?? 'unknown error'}`);
        break;
      }
    }
    setProgress(null);
    load();
  };

  const openModal = async (m: Message) => {
    setModal(m);
    setModalBlocks(null);
    const res = await fetch(`/api/admin/email-audit?email=${encodeURIComponent(m.previewId)}`);
    if (res.ok) {
      const d = await res.json();
      setModalBlocks((d.blocks as Block[]) ?? []);
    } else {
      setModalBlocks([]);
    }
  };

  const matches = (m: Message) => {
    if (onlyBroken && brokenLinks(m).length === 0) return false;
    if (onlyDuplicated && !m.variantsDiffer) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${m.title} ${m.subject} ${m.reps.join(' ')} ${m.phase ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const proxied = (src: string) =>
    /hubspotusercontent/.test(src)
      ? `/api/admin/email-audit/img?u=${encodeURIComponent(src)}`
      : src;

  const font = { fontFamily: 'brother-1816, sans-serif' } as const;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Email Audit</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={rerun}
              disabled={progress !== null}
              className="text-sm bg-white text-[#02176f] font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors disabled:opacity-60"
            >
              {progress ? 'Auditing…' : 'Re-run audit'}
            </button>
            <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
              Back to admin
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8" style={font}>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : setupState === 'db' ? (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <p className="text-[#02176f] font-bold mb-1">Database tables missing</p>
            <p className="text-sm text-gray-600">
              The audit tables have not been pushed yet. Run <code>npx prisma db push</code> against the
              production database, then reload.
            </p>
          </div>
        ) : (
          <>
            {!tokenConfigured && (
              <div className="bg-[#fff7e6] border border-[#f0c36d] rounded-xl p-4 mb-6 text-sm text-[#6b5310]">
                <strong>HUBSPOT_MARKETING_TOKEN is not set.</strong> Create a HubSpot private app with only
                the <code>content</code> and <code>automation</code> scopes and add its token to the
                environment. Do not reuse the CRM token.
              </div>
            )}

            {progress && (
              <div className="bg-white rounded-xl shadow-sm p-4 mb-6 text-sm text-[#02176f]">
                <p className="font-bold mb-1">Audit in progress — {progress.phase ?? 'starting'}</p>
                <p>
                  {progress.totalEmails} emails listed · {progress.detailsFetched} details fetched ·{' '}
                  {progress.checkedLinks}/{progress.totalLinks || '?'} links checked
                </p>
              </div>
            )}
            {runError && (
              <div className="bg-[#fdecea] border border-[#f5b5ae] rounded-xl p-4 mb-6 text-sm text-[#8a1f14]">
                {runError}
              </div>
            )}

            {!view ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <p className="text-gray-600 mb-4">No audit has been run yet.</p>
                <button
                  onClick={rerun}
                  disabled={progress !== null || !tokenConfigured}
                  className="bg-[#0088ff] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#0077e0] transition-colors disabled:opacity-60"
                >
                  Run the first audit
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600 mb-6">
                  <span>
                    Last run <strong>{new Date(view.runAt).toLocaleString()}</strong>
                  </span>
                  <span>{view.totals.emails} marketing emails</span>
                  <span>
                    {view.totals.flows} flows ({view.totals.flowsEnabled} enabled)
                  </span>
                  <span>
                    {view.totals.sequenceEmails} sequence emails → {view.totals.distinctMessages} messages
                  </span>
                  <span className={view.totals.brokenLinks ? 'text-red-600 font-bold' : ''}>
                    {view.totals.brokenLinks} broken links
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subject, title, rep…"
                    className="h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm w-64"
                  />
                  <label className="flex items-center gap-1.5 text-sm text-[#02176f]">
                    <input type="checkbox" checked={onlyBroken} onChange={(e) => setOnlyBroken(e.target.checked)} />
                    Only broken links
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-[#02176f]">
                    <input
                      type="checkbox"
                      checked={onlyDuplicated}
                      onChange={(e) => setOnlyDuplicated(e.target.checked)}
                    />
                    Only copy-differs
                  </label>
                </div>

                {[...view.sections,
                  ...(view.unmatchedSequenced.length
                    ? [{ title: 'Other sequences', messages: view.unmatchedSequenced }]
                    : []),
                  ...(view.other.length ? [{ title: 'Other marketing emails', messages: view.other }] : []),
                ].map((section) => {
                  const visible = section.messages.filter(matches);
                  if (!visible.length) return null;
                  return (
                    <section key={section.title} className="mb-8">
                      <h2 className="text-[#02176f] font-bold uppercase text-sm tracking-wider mb-3">
                        {section.title}
                        <span className="text-gray-400 font-normal normal-case ml-2">{visible.length}</span>
                      </h2>
                      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                        {visible.map((m) => {
                          const dead = brokenLinks(m);
                          return (
                            <button
                              key={m.key}
                              onClick={() => openModal(m)}
                              className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-2 hover:bg-[#f6faff] transition-colors"
                            >
                              {m.phase && (
                                <span className="text-[11px] font-bold text-white bg-[#02176f] rounded px-2 py-0.5 whitespace-nowrap">
                                  {stamp(m)}
                                </span>
                              )}
                              <span className="font-semibold text-[#02176f] flex-1 min-w-[200px]">
                                {m.subject || m.title}
                              </span>
                              {m.reps.map((r) => (
                                <span key={r} className="text-[11px] bg-[#eef4f9] text-[#02176f] rounded-full px-2 py-0.5">
                                  {r}
                                </span>
                              ))}
                              {dead.length > 0 && (
                                <span className="text-[11px] font-bold bg-[#fdecea] text-[#8a1f14] rounded-full px-2 py-0.5">
                                  {dead.length} dead link{dead.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {m.variantsDiffer && (
                                <span className="text-[11px] font-bold bg-[#fff7e6] text-[#6b5310] rounded-full px-2 py-0.5">
                                  copy differs by rep
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </>
        )}
      </main>

      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 sm:py-10"
          onClick={() => setModal(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-xl bg-white overflow-hidden text-left"
            style={font}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-[#02176f] font-bold">{modal.subject || modal.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {stamp(modal)}
                  {modal.copies.length > 1
                    ? ` · sent as ${modal.copies.length} rep copies (${modal.reps.join(', ')})`
                    : modal.reps.length
                      ? ` · ${modal.reps.join(', ')}`
                      : ''}
                </p>
              </div>
              <button
                aria-label="Close"
                onClick={() => setModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-[#02176f] text-lg font-bold leading-none flex-none"
              >
                &times;
              </button>
            </div>

            {brokenLinks(modal).length > 0 && (
              <div className="px-5 py-3 bg-[#fdecea] text-sm text-[#8a1f14]">
                <p className="font-bold mb-1">Broken links</p>
                {brokenLinks(modal).map((l) => (
                  <p key={l.url + l.text} className="truncate">
                    {l.text ? `"${l.text}" — ` : ''}
                    <span className="font-mono text-xs">{l.url || '(empty destination)'}</span>
                    {l.httpStatus ? ` (HTTP ${l.httpStatus})` : ''}
                  </p>
                ))}
              </div>
            )}

            <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
              {modalBlocks === null ? (
                <p className="text-gray-500 text-sm">Loading email…</p>
              ) : modalBlocks.length === 0 ? (
                <p className="text-gray-500 text-sm">No stored content for this email.</p>
              ) : (
                modalBlocks.map((b, i) => {
                  if (b.type === 'image') {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element -- proxied external email asset
                      <img key={i} src={proxied(b.src)} alt={b.alt ?? ''} className="max-w-full h-auto my-2 rounded" />
                    );
                  }
                  if (b.type === 'cta') {
                    return (
                      <p key={i} className="my-3 text-center">
                        <span className="inline-block bg-[#0088ff] text-white font-bold px-5 py-2.5 rounded">
                          {b.text || '(unlabelled button)'}
                        </span>
                        <span className="block text-xs text-gray-400 mt-1 font-mono truncate">
                          {b.url || '(no destination)'}
                        </span>
                      </p>
                    );
                  }
                  return (
                    <div
                      key={i}
                      className="my-2 text-sm leading-relaxed [&_a]:text-[#0088ff] [&_a]:underline"
                      // Admin-only page; content is authored by staff in HubSpot.
                      dangerouslySetInnerHTML={{ __html: b.html }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
