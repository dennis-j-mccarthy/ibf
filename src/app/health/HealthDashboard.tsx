'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  SCOPE_NOTE,
  STAKEHOLDERS,
  STATUS_LABEL,
  isBuildout,
  isHealthy,
  type HealthItem,
  type ItemStatus,
  type Project,
  type ProjectMeta,
} from '@/lib/health/data';

type Day = { date: string; state: 'up' | 'down' | 'unknown'; minutes: number };

type ProjectView = {
  meta: ProjectMeta;
  items: HealthItem[];
  strip: Day[];
  uptime: number | null;
  daysSince: number | null;
  monitoringSince: string | null;
};

type Comment = {
  id: string;
  itemId: string;
  project: string;
  stakeholderName: string;
  body: string;
  createdAt: string;
};

const STATUS_STYLE: Record<ItemStatus, { dot: string; chip: string }> = {
  operational: { dot: 'bg-[#00c853]', chip: 'bg-[#e8f8ee] text-[#0a7a3d]' },
  resolved: { dot: 'bg-[#00c853]', chip: 'bg-[#e8f8ee] text-[#0a7a3d]' },
  monitoring: { dot: 'bg-[#0088ff]', chip: 'bg-[#e9f4ff] text-[#0058a8]' },
  // Brand yellow #ffd41d is too pale to read as text, so the dot carries the
  // yellow and the chip uses a darker amber for contrast.
  degraded: { dot: 'bg-[#ffd41d]', chip: 'bg-[#fff8dd] text-[#8a6100]' },
  // Buildout is new work, not a defect -- blue/violet reads as activity, while
  // orange and coral stay reserved for things that are actually wrong.
  buildout: { dot: 'bg-[#6366f1]', chip: 'bg-[#eef0ff] text-[#4338ca]' },
  'in-progress': { dot: 'bg-[#f29500]', chip: 'bg-[#fff4e0] text-[#96590a]' },
  investigating: { dot: 'bg-[#ff6445]', chip: 'bg-[#ffece8] text-[#a83318]' },
};

function parse(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = parse(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Sep 1 – 11, 2026" within a month, "Aug 28 – Sep 11, 2026" across months. */
function fmtRange(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '';
  const a = parse(startIso);
  const b = parse(endIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '';
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const left = sameMonth
    ? a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const right = sameMonth
    ? `${b.getDate()}, ${b.getFullYear()}`
    : b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${left} – ${right}`;
}

export default function HealthDashboard({
  projects,
  windowDays,
  generatedAt,
  hasBaseline,
}: {
  projects: ProjectView[];
  windowDays: number;
  generatedAt: string;
  hasBaseline: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<Project | 'general'>('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/health/comments');
      if (res.ok) setComments(await res.json());
    } catch {
      /* comment list is non-critical; the board still stands on its own */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/health/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: target, stakeholderName: name, body, website: honeypot }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Could not post that comment.');
        return;
      }
      setName('');
      setBody('');
      form.reset();
      await load();
    } catch {
      setError('Could not post that comment.');
    } finally {
      setBusy(false);
    }
  };

  const allItems = projects.flatMap((p) => p.items);
  const healthyCount = allItems.filter((i) => isHealthy(i.status)).length;
  const buildCount = allItems.filter((i) => isBuildout(i.status)).length;
  const openCount = allItems.length - healthyCount - buildCount;

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#02176f] px-6 py-12 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
            Ignatius Book Fairs
          </div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">System Health</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
            A running record of what is working, what has been reported, and what is being fixed
            across both properties. Updated as things change, not only when something goes wrong.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-2xl font-bold">{healthyCount}</div>
              <div className="text-xs text-white/70">systems operational</div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-2xl font-bold">{buildCount}</div>
              <div className="text-xs text-white/70">
                new {buildCount === 1 ? 'feature' : 'features'} in build
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-2xl font-bold">{openCount}</div>
              <div className="text-xs text-white/70">
                open {openCount === 1 ? 'issue' : 'issues'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex gap-3 rounded-xl border border-[#cfe3ff] bg-[#f2f8ff] px-5 py-4">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0088ff] text-[11px] font-bold text-white"
          >
            i
          </span>
          <div>
            <p className="text-sm font-semibold text-[#02176f]">What this board covers</p>
            <p className="mt-1 text-sm leading-relaxed text-[#5c5f6b]">{SCOPE_NOTE}</p>
          </div>
        </div>

        {!hasBaseline && (
          <div className="mb-8 rounded-xl border border-[#ffd41d] bg-[#fffaea] px-5 py-4">
            <p className="text-sm font-semibold text-[#02176f]">Uptime history not yet recorded</p>
            <p className="mt-1 text-sm leading-relaxed text-[#5c5f6b]">
              The timeline below is deliberately blank rather than showing green. We only publish
              uptime we can actually vouch for, so these charts stay empty until verified incident
              history is entered.
            </p>
          </div>
        )}

        {projects.map((p) => (
          <section
            key={p.meta.id}
            className="mb-8 overflow-hidden rounded-2xl border border-[#e4e6ea] bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#02176f]">{p.meta.name}</h2>
                <p className="mt-1 text-sm text-[#7e828f]">{p.meta.blurb}</p>
                <a
                  href={p.meta.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs font-semibold text-[#0088ff] hover:opacity-80"
                >
                  {p.meta.url.replace('https://', '')}
                </a>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#02176f]">
                    {p.daysSince === null ? '—' : p.daysSince}
                  </div>
                  <div className="text-xs text-[#7e828f]">
                    {p.daysSince === null ? 'not yet measured' : 'days since downtime'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#02176f]">
                    {p.uptime === null ? '—' : `${p.uptime.toFixed(2)}%`}
                  </div>
                  <div className="text-xs text-[#7e828f]">{windowDays}-day uptime</div>
                </div>
              </div>
            </div>

            {/* Day strip */}
            <div className="px-6 py-5">
              <div className="mb-2 flex items-center justify-between text-xs text-[#7e828f]">
                <span>{windowDays} days ago</span>
                <span>Today</span>
              </div>
              <div className="flex gap-[2px]" role="img" aria-label={`${windowDays}-day status timeline`}>
                {p.strip.map((d) => (
                  <div
                    key={d.date}
                    title={
                      d.state === 'unknown'
                        ? `${d.date} — no data`
                        : d.state === 'down'
                          ? `${d.date} — ${d.minutes} min down`
                          : `${d.date} — operational`
                    }
                    className={`h-9 flex-1 rounded-[2px] ${
                      d.state === 'up'
                        ? 'bg-[#00c853]'
                        : d.state === 'down'
                          ? 'bg-[#ff6445]'
                          : 'bg-[#e4e6ea]'
                    }`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#7e828f]">
                <Legend className="bg-[#00c853]" label="Operational" />
                <Legend className="bg-[#ff6445]" label="Downtime" />
                <Legend className="bg-[#e4e6ea]" label="No data recorded" />
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-[#eef0f3]">
              {p.items.map((item) => {
                const s = STATUS_STYLE[item.status];
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-start gap-3 border-b border-[#f3f4f6] px-6 py-4 last:border-b-0"
                  >
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#1a1b1f]">{item.title}</div>
                      <p className="mt-0.5 text-sm leading-relaxed text-[#5c5f6b]">{item.detail}</p>
                      {(item.reportedOn || item.targetDate || item.resolvedOn) && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7e828f]">
                          {item.reportedOn && <span>Reported {fmtDate(item.reportedOn)}</span>}
                          {item.targetDate &&
                            (item.startDate ? (
                              <span>Expected {fmtRange(item.startDate, item.targetDate)}</span>
                            ) : (
                              <span>Target {fmtDate(item.targetDate)}</span>
                            ))}
                          {item.resolvedOn && <span>Resolved {fmtDate(item.resolvedOn)}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.owners?.map((o) => (
                        <span
                          key={o}
                          className="rounded-full border border-[#e4e6ea] bg-[#f7f8fa] px-3 py-1 text-xs font-semibold text-[#5c5f6b]"
                        >
                          {o}
                        </span>
                      ))}
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.chip}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>

                    <ItemComments
                      itemId={item.id}
                      project={p.meta.id}
                      comments={comments.filter((c) => c.itemId === item.id)}
                      onPosted={load}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Comments */}
        <section className="rounded-2xl border border-[#e4e6ea] bg-white">
          <div className="border-b border-[#eef0f3] px-6 py-5">
            <h2 className="text-xl font-bold text-[#02176f]">Stakeholder comments</h2>
            <p className="mt-1 text-sm text-[#7e828f]">
              Seeing something we have not listed? Add it here and it will be triaged.
            </p>
          </div>

          <div className="px-6">
            {comments.length === 0 ? (
              <p className="py-5 text-sm text-[#7e828f]">No comments yet.</p>
            ) : (
              [...comments].reverse().map((c) => (
                <div key={c.id} className="border-b border-[#f3f4f6] py-4 last:border-b-0">
                  <div className="text-xs text-[#7e828f]">
                    <span className="font-semibold text-[#1a1b1f]">{c.stakeholderName}</span>
                    {c.project !== 'general' && (
                      <span className="ml-2 rounded bg-[#f0f2f5] px-1.5 py-0.5">
                        {projects.find((p) => p.meta.id === c.project)?.meta.name ?? c.project}
                      </span>
                    )}
                    <span className="ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#1a1b1f]">{c.body}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={submit} className="border-t border-[#eef0f3] px-6 py-5">
            <div className="flex flex-wrap gap-3">
              <select
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-w-[180px] flex-1 rounded-lg border border-[#e4e6ea] bg-white px-3 py-2 text-sm text-[#1a1b1f] outline-none focus:border-[#0088ff]"
              >
                <option value="">Your name…</option>
                {STAKEHOLDERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as Project | 'general')}
                className="rounded-lg border border-[#e4e6ea] px-3 py-2 text-sm text-[#1a1b1f] outline-none focus:border-[#0088ff]"
              >
                <option value="general">General</option>
                {projects.map((p) => (
                  <option key={p.meta.id} value={p.meta.id}>
                    {p.meta.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your comment"
              maxLength={2000}
              required
              className="mt-3 min-h-[90px] w-full resize-y rounded-lg border border-[#e4e6ea] px-3 py-2 text-sm outline-none focus:border-[#0088ff]"
            />
            {/* Honeypot: off-screen and untabbable, not display:none -- some bots
                skip hidden inputs, and skipping is what we want to prevent. */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden opacity-0">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#0088ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
              >
                {busy ? 'Posting…' : 'Post comment'}
              </button>
              {error && <span className="text-sm text-[#ff6445]">{error}</span>}
            </div>
          </form>
        </section>

        <p className="mt-8 text-center text-xs text-[#7e828f]">
          Generated {new Date(generatedAt).toLocaleString()}
        </p>
      </div>
    </main>
  );
}

/** Per-item comment thread. Collapsed by default so ten of these don't bury
 *  the status list they hang off. */
function ItemComments({
  itemId,
  project,
  comments,
  onPosted,
}: {
  itemId: string;
  project: Project;
  comments: Comment[];
  onPosted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const honeypot = (form.elements.namedItem('website') as HTMLInputElement | null)?.value ?? '';
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/health/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, project, stakeholderName: name, body, website: honeypot }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Could not post that comment.');
        return;
      }
      setBody('');
      await onPosted();
    } catch {
      setError('Could not post that comment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full pl-[22px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-2 text-xs font-semibold text-[#0088ff] transition hover:opacity-70"
      >
        {open ? 'Hide comments' : 'Comments'}
        {comments.length > 0 && ` (${comments.length})`}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-[#eef0f3] bg-[#fbfcfd] p-3">
          {comments.length === 0 ? (
            <p className="text-xs text-[#7e828f]">No comments on this item yet.</p>
          ) : (
            [...comments].reverse().map((c) => (
              <div key={c.id} className="border-b border-[#eef0f3] py-2 first:pt-0 last:border-b-0 last:pb-0">
                <div className="text-xs text-[#7e828f]">
                  <span className="font-semibold text-[#1a1b1f]">{c.stakeholderName}</span>
                  <span className="ml-2">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-[#1a1b1f]">{c.body}</p>
              </div>
            ))
          )}

          <form onSubmit={submit} className="mt-3 flex flex-wrap items-start gap-2">
            <select
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-[#e4e6ea] bg-white px-2 py-1.5 text-xs text-[#1a1b1f] outline-none focus:border-[#0088ff]"
            >
              <option value="">Your name…</option>
              {STAKEHOLDERS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment"
              maxLength={2000}
              required
              rows={2}
              className="min-w-[200px] flex-1 resize-y rounded-lg border border-[#e4e6ea] px-2 py-1.5 text-xs outline-none focus:border-[#0088ff]"
            />
            <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden opacity-0">
              <label>
                Website
                <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <button
              type="submit"
              disabled={busy || !name || !body}
              className="rounded-lg bg-[#0088ff] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
            >
              {busy ? 'Posting…' : 'Post'}
            </button>
            {error && <p className="w-full text-xs text-[#ff6445]">{error}</p>}
          </form>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
      {label}
    </span>
  );
}
