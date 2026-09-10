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
  thumb: string | null;
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

type Comment = { id: string; author: string; body: string; createdAt: string };

// Lazily fetched per-message content, cached for the session so reopening an
// accordion is instant.
type Detail = { blocks: Block[] | null; comments: Comment[] };

const brokenLinks = (m: Message) => m.links.filter((l) => l.status === 'broken');

// "VF Fair -15" renders as a countdown stamp like "VF FAIR −15".
function stamp(m: Message): string {
  if (!m.phase) return '';
  const off = m.offset == null ? '' : ` ${m.offset > 0 ? `+${m.offset}` : m.offset === 0 ? '±0' : m.offset}`;
  return `${m.phase.toUpperCase()}${off}`;
}

const proxied = (src: string) =>
  /hubspotusercontent/.test(src) ? `/api/admin/email-audit/img?u=${encodeURIComponent(src)}` : src;

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
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [postingKey, setPostingKey] = useState<string | null>(null);

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
    setDetails({});
    load();
  };

  const toggle = async (m: Message) => {
    const opening = !open.has(m.key);
    setOpen((prev) => {
      const next = new Set(prev);
      if (opening) next.add(m.key);
      else next.delete(m.key);
      return next;
    });
    if (!opening || details[m.key]) return;
    setDetails((d) => ({ ...d, [m.key]: { blocks: null, comments: [] } }));
    const [res, cres] = await Promise.all([
      fetch(`/api/admin/email-audit?email=${encodeURIComponent(m.previewId)}`),
      fetch(`/api/admin/email-audit/comments?key=${encodeURIComponent(m.key)}`),
    ]);
    const blocks: Block[] = res.ok ? (((await res.json()).blocks as Block[]) ?? []) : [];
    const comments: Comment[] = cres.ok ? (((await cres.json()).comments as Comment[]) ?? []) : [];
    setDetails((d) => ({ ...d, [m.key]: { blocks, comments } }));
  };

  const postComment = async (m: Message) => {
    const text = (drafts[m.key] ?? '').trim();
    if (!text) return;
    setPostingKey(m.key);
    const res = await fetch('/api/admin/email-audit/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: m.key, body: text }),
    });
    setPostingKey(null);
    if (res.ok) {
      const d = await res.json();
      setDetails((prev) => {
        const cur = prev[m.key] ?? { blocks: [], comments: [] };
        return { ...prev, [m.key]: { ...cur, comments: [...cur.comments, d.comment] } };
      });
      setDrafts((prev) => ({ ...prev, [m.key]: '' }));
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

  const font = { fontFamily: 'brother-1816, sans-serif' } as const;

  const allSections = view
    ? [
        ...view.sections,
        ...(view.unmatchedSequenced.length
          ? [{ title: 'Other sequences', messages: view.unmatchedSequenced }]
          : []),
        ...(view.other.length ? [{ title: 'Other marketing emails', messages: view.other }] : []),
      ]
    : [];

  const visibleKeys = allSections.flatMap((s) => s.messages.filter(matches).map((m) => m.key));
  const allOpen = visibleKeys.length > 0 && visibleKeys.every((k) => open.has(k));

  const expandAll = () => {
    if (allOpen) {
      setOpen(new Set());
      return;
    }
    setOpen(new Set(visibleKeys));
    // Fetch content for anything not yet loaded, a few at a time.
    const pending = allSections
      .flatMap((s) => s.messages.filter(matches))
      .filter((m) => !details[m.key]);
    pending.forEach((m) => {
      setDetails((d) => ({ ...d, [m.key]: { blocks: null, comments: [] } }));
    });
    (async () => {
      for (let i = 0; i < pending.length; i += 4) {
        await Promise.all(
          pending.slice(i, i + 4).map(async (m) => {
            const [res, cres] = await Promise.all([
              fetch(`/api/admin/email-audit?email=${encodeURIComponent(m.previewId)}`),
              fetch(`/api/admin/email-audit/comments?key=${encodeURIComponent(m.key)}`),
            ]);
            const blocks: Block[] = res.ok ? (((await res.json()).blocks as Block[]) ?? []) : [];
            const comments: Comment[] = cres.ok ? (((await cres.json()).comments as Comment[]) ?? []) : [];
            setDetails((d) => ({ ...d, [m.key]: { blocks, comments } }));
          }),
        );
      }
    })();
  };

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
                  <button
                    onClick={expandAll}
                    className="text-sm text-[#02176f] font-semibold border border-[#02176f]/30 rounded-lg px-3 py-1.5 hover:bg-[#eef4f9] transition-colors"
                  >
                    {allOpen ? 'Collapse all' : 'Expand all'}
                  </button>
                </div>

                {allSections.map((section) => {
                  const visible = section.messages.filter(matches);
                  if (!visible.length) return null;
                  return (
                    <section key={section.title} className="mb-8">
                      <h2 className="text-[#02176f] font-bold uppercase text-sm tracking-wider mb-3">
                        {section.title}
                        <span className="text-gray-400 font-normal normal-case ml-2">{visible.length}</span>
                      </h2>
                      <div className="flex flex-col gap-2">
                        {visible.map((m) => {
                          const dead = brokenLinks(m);
                          const isOpen = open.has(m.key);
                          const detail = details[m.key];
                          return (
                            <div key={m.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                              <button
                                onClick={() => toggle(m)}
                                aria-expanded={isOpen}
                                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f6faff] transition-colors"
                              >
                                {m.thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- proxied external email asset
                                  <img
                                    src={proxied(m.thumb)}
                                    alt=""
                                    loading="lazy"
                                    className="w-16 h-16 object-cover object-top rounded-md border border-gray-200 flex-none bg-gray-50"
                                  />
                                ) : (
                                  <span className="w-16 h-16 rounded-md border border-dashed border-gray-300 flex-none flex items-center justify-center text-[10px] text-gray-400">
                                    no art
                                  </span>
                                )}
                                <span className="flex-1 min-w-0">
                                  <span className="flex flex-wrap items-center gap-2">
                                    {m.phase && (
                                      <span className="text-[11px] font-bold text-white bg-[#02176f] rounded px-2 py-0.5 whitespace-nowrap">
                                        {stamp(m)}
                                      </span>
                                    )}
                                    <span className="font-semibold text-[#02176f]">{m.subject || m.title}</span>
                                  </span>
                                  <span className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {m.reps.map((r) => (
                                      <span
                                        key={r}
                                        className="text-[11px] bg-[#eef4f9] text-[#02176f] rounded-full px-2 py-0.5"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                    {m.copies.length > 1 && (
                                      <span className="text-[11px] text-gray-400">{m.copies.length} copies</span>
                                    )}
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
                                    {detail && detail.comments.length > 0 && (
                                      <span className="text-[11px] bg-[#eef4f9] text-[#02176f] rounded-full px-2 py-0.5">
                                        {detail.comments.length} comment{detail.comments.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <span
                                  className={`text-[#02176f] text-sm flex-none transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                  aria-hidden
                                >
                                  ▾
                                </span>
                              </button>

                              {isOpen && (
                                <div className="border-t border-gray-100">
                                  {dead.length > 0 && (
                                    <div className="px-5 py-3 bg-[#fdecea] text-sm text-[#8a1f14]">
                                      <p className="font-bold mb-1">Broken links</p>
                                      {dead.map((l) => (
                                        <p key={l.url + l.text} className="truncate">
                                          {l.text ? `"${l.text}" — ` : ''}
                                          <span className="font-mono text-xs">{l.url || '(empty destination)'}</span>
                                          {l.httpStatus ? ` (HTTP ${l.httpStatus})` : ''}
                                        </p>
                                      ))}
                                    </div>
                                  )}

                                  {m.copies.length > 1 && (
                                    <p className="px-5 pt-3 text-xs text-gray-500">
                                      Sent as {m.copies.length} rep copies ({m.reps.join(', ')}).{' '}
                                      {m.variantsDiffer
                                        ? 'Wording differs between reps — worth reconciling.'
                                        : 'Wording is identical apart from the signature.'}
                                    </p>
                                  )}

                                  <div className="px-5 py-4">
                                    {!detail || detail.blocks === null ? (
                                      <p className="text-gray-500 text-sm">Loading email…</p>
                                    ) : detail.blocks.length === 0 ? (
                                      <p className="text-gray-500 text-sm">No stored content for this email.</p>
                                    ) : (
                                      <div className="max-w-2xl">
                                        {detail.blocks.map((b, i) => {
                                          if (b.type === 'image') {
                                            return (
                                              // eslint-disable-next-line @next/next/no-img-element -- proxied external email asset
                                              <img
                                                key={i}
                                                src={proxied(b.src)}
                                                alt={b.alt ?? ''}
                                                loading="lazy"
                                                className="max-w-full h-auto my-2 rounded"
                                              />
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
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  <div className="px-5 py-3 border-t border-gray-100 bg-[#fafbfc]">
                                    <p className="text-xs font-bold uppercase tracking-wide text-[#7e828f] mb-2">
                                      Comments
                                    </p>
                                    {(!detail || detail.comments.length === 0) && (
                                      <p className="text-xs text-gray-400 mb-2">No comments yet.</p>
                                    )}
                                    {detail?.comments.map((c) => (
                                      <div key={c.id} className="mb-2">
                                        <p className="text-xs text-[#02176f] font-bold">
                                          {c.author.split('@')[0]}
                                          <span className="text-gray-400 font-normal ml-2">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                          </span>
                                        </p>
                                        <p className="text-sm text-[#3a3f4b]">{c.body}</p>
                                      </div>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        value={drafts[m.key] ?? ''}
                                        onChange={(e) => setDrafts((d) => ({ ...d, [m.key]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') postComment(m);
                                        }}
                                        placeholder="Add a comment…"
                                        className="flex-1 h-9 px-3 rounded-lg border border-gray-300 text-sm"
                                      />
                                      <button
                                        onClick={() => postComment(m)}
                                        disabled={postingKey === m.key || !(drafts[m.key] ?? '').trim()}
                                        className="text-sm bg-[#0088ff] text-white font-bold px-4 rounded-lg disabled:opacity-50"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
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
    </div>
  );
}
