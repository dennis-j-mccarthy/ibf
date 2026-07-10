'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type Blog = {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  thumbnail: string | null;
  category: string | null;
  color: string | null;
  embedHtml: string | null;
  featured: boolean;
  archived: boolean;
  starred: boolean;
  newsletteredAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Draft = Partial<Blog> & { published?: boolean };

const EMPTY: Draft = {
  title: '',
  content: '',
  summary: '',
  thumbnail: '',
  category: '',
  color: '',
  embedHtml: '',
  featured: false,
  starred: false,
  published: true,
};

const input =
  'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]';
const label = 'block text-sm font-medium text-[#02176f] mb-1';
const SITE = 'https://www.ignatiusbookfairs.com';

// --- inline SVG icons (no emoji) ---
const iconProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, viewBox: '0 0 24 24' } as const;
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className="w-4 h-4" {...iconProps} fill={filled ? 'currentColor' : 'none'}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.5a.56.56 0 011.04 0l2.09 4.24 4.68.68a.56.56 0 01.31.96l-3.39 3.3.8 4.67a.56.56 0 01-.81.59L12 15.9l-4.19 2.2a.56.56 0 01-.81-.58l.8-4.68-3.39-3.3a.56.56 0 01.31-.96l4.68-.68 2.09-4.24z" />
  </svg>
);
const PromoIcon = () => (
  <svg className="w-4 h-4" {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.9v13.3a1.76 1.76 0 01-3.42.6l-1.53-4.4M18 13a3 3 0 100-6M5.44 13.68A4 4 0 017 6h1.83c4.1 0 7.62-1.23 9.17-3v14c-1.55-1.77-5.07-3-9.17-3H7a4 4 0 01-1.56-.32z" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.86 4.49l1.69-1.69a1.87 1.87 0 112.65 2.65L10.58 16.07a4.5 4.5 0 01-1.9 1.13L6 18l.8-2.69a4.5 4.5 0 011.13-1.9l8.93-8.92z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.35 9m-4.78 0L9.26 9M4.77 5.79c.34-.06.68-.11 1.02-.16m0 0a48 48 0 013.48-.4m7.5 0v-.91c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 00-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.91m7.5 0a48.67 48.67 0 00-7.5 0m11.16.16l-.71 13.88a2.25 2.25 0 01-2.24 2.08H8.08a2.25 2.25 0 01-2.24-2.08L5.13 5.95" />
  </svg>
);
const Chevron = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} {...iconProps}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

function IconButton({
  onClick,
  title,
  children,
  danger,
  active,
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`grid place-items-center w-8 h-8 rounded-md border transition-colors ${
        active
          ? 'border-blue-200 text-blue-600 bg-blue-50'
          : danger
            ? 'border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#02176f]'
      }`}
    >
      {children}
    </button>
  );
}

export default function BlogAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nlTitle, setNlTitle] = useState('');
  const [nlTimeframe, setNlTimeframe] = useState('');
  const [nlSubject, setNlSubject] = useState('');
  const [nlPreamble, setNlPreamble] = useState('');
  const [nlBusy, setNlBusy] = useState<'title' | 'subject' | 'preamble' | null>(null);
  const [nlError, setNlError] = useState('');
  const [titleOpts, setTitleOpts] = useState<string[]>([]);
  const [subjectOpts, setSubjectOpts] = useState<string[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCategory, setAiCategory] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/blog');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPreviewOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Default the timeframe to the current month/year on first load.
  useEffect(() => {
    setNlTimeframe(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }, []);

  const starred = items.filter((b) => b.starred);

  const suggestNL = async (kind: 'title' | 'subject' | 'preamble') => {
    setNlBusy(kind);
    setNlError('');
    const res = await fetch('/api/admin/blog/newsletter-suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, timeframe: nlTimeframe }),
    });
    setNlBusy(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setNlError(d.error || 'Suggestion failed');
      return;
    }
    const data: { options?: string[]; text?: string } = await res.json();
    if (kind === 'title') setTitleOpts(data.options ?? []);
    else if (kind === 'subject') setSubjectOpts(data.options ?? []);
    else setNlPreamble(data.text ?? '');
  };

  const startNew = () => {
    setDraft({ ...EMPTY });
    setEditingId('new');
    setAiOpen(false);
    setError('');
  };
  const startEdit = (b: Blog) => {
    setDraft({ ...b, published: b.publishedAt != null });
    setEditingId(b.id);
    setError('');
  };
  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setError('');
  };
  // Accordion toggle: only one post open at a time.
  const toggle = (b: Blog) => (editingId === b.id ? cancel() : startEdit(b));

  const save = async () => {
    if (!draft.title?.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    setError('');
    const isNew = editingId === 'new';
    const body = {
      title: draft.title,
      content: draft.content ?? '',
      summary: draft.summary || null,
      thumbnail: draft.thumbnail || null,
      category: draft.category || null,
      color: draft.color || null,
      embedHtml: draft.embedHtml || null,
      featured: draft.featured === true,
      starred: draft.starred === true,
      published: draft.published !== false,
    };
    const res = await fetch(isNew ? '/api/admin/blog' : `/api/admin/blog/${editingId}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Save failed');
      return;
    }
    cancel();
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === id) cancel();
      load();
    }
  };

  const toggleStar = async (b: Blog) => {
    await fetch(`/api/admin/blog/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !b.starred }),
    });
    load();
  };

  // A designed, email-safe newsletter (inline styles + table layout) — this is
  // exactly what Copy HTML produces and what the Preview renders.
  const newsletterHtml = () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const articles = starred
      .map(
        (b) => `
        <tr><td style="padding:0 0 24px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #eceef2;border-radius:12px;overflow:hidden;background:#ffffff;">
            ${
              b.thumbnail
                ? `<tr><td style="font-size:0;line-height:0;"><a href="${SITE}/blog/${b.slug}"><img src="${b.thumbnail}" alt="" width="560" style="display:block;width:100%;max-height:240px;object-fit:cover;border:0;" /></a></td></tr>`
                : ''
            }
            <tr><td style="padding:22px 24px 24px 24px;">
              ${
                b.category
                  ? `<div style="font:700 11px/1 Arial,Helvetica,sans-serif;letter-spacing:.09em;text-transform:uppercase;color:#0088ff;margin:0 0 10px 0;">${esc(b.category)}</div>`
                  : ''
              }
              <a href="${SITE}/blog/${b.slug}" style="text-decoration:none;"><h2 style="margin:0 0 10px 0;font:700 21px/1.3 Georgia,'Times New Roman',serif;color:#02176f;">${esc(b.title)}</h2></a>
              ${
                b.summary
                  ? `<p style="margin:0 0 18px 0;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#4a4d57;">${esc(b.summary)}</p>`
                  : ''
              }
              <a href="${SITE}/blog/${b.slug}" style="display:inline-block;background:#02176f;color:#ffffff;font:600 14px/1 Arial,Helvetica,sans-serif;text-decoration:none;padding:12px 22px;border-radius:8px;">Read the article &rarr;</a>
            </td></tr>
          </table>
        </td></tr>`
      )
      .join('');

    return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#eef0f4;margin:0;padding:0;">
  <tr><td align="center" style="padding:28px 12px;">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;">
      <tr><td style="background:#02176f;border-radius:16px 16px 0 0;padding:30px 24px;text-align:center;">
        <div style="font:700 12px/1 Arial,Helvetica,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#aac2ff;margin:0 0 8px 0;">Ignatius Book Fairs</div>
        <div style="font:700 25px/1.2 Georgia,'Times New Roman',serif;color:#ffffff;letter-spacing:.01em;">${esc(nlTitle) || 'Newsletter'}</div>
        ${nlTimeframe ? `<div style="font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#aac2ff;margin-top:8px;">${esc(nlTimeframe)}</div>` : ''}
      </td></tr>
      <tr><td style="background:#ffffff;padding:28px 20px 4px 20px;">
        ${nlPreamble ? `<p style="margin:0 0 26px 0;font:400 16px/1.7 Georgia,'Times New Roman',serif;color:#3a3d47;">${esc(nlPreamble)}</p>` : ''}
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${articles}</table>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;border-top:1px solid #eceef2;padding:24px;text-align:center;font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#8b8f99;">
        Ignatius Book Fairs &middot; <a href="${SITE}" style="color:#0088ff;text-decoration:none;">ignatiusbookfairs.com</a><br/>
        You&rsquo;re receiving this because you&rsquo;re part of the Ignatius Book Fairs community.
      </td></tr>
    </table>
  </td></tr>
</table>`;
  };

  const markNewsletterSent = async () => {
    if (!confirm(`Mark the newsletter as sent? This clears all ${starred.length} starred post(s).`)) return;
    const res = await fetch('/api/admin/blog/newsletter-sent', { method: 'POST' });
    if (res.ok) {
      setPreviewOpen(false);
      load();
    }
  };

  const copyNewsletter = async () => {
    await navigator.clipboard.writeText(newsletterHtml());
    alert('Newsletter HTML copied to clipboard.');
  };

  const generateAI = async () => {
    if (!aiTopic.trim()) {
      setAiError('Enter a topic.');
      return;
    }
    setAiBusy(true);
    setAiError('');
    const res = await fetch('/api/admin/blog/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: aiTopic, category: aiCategory || null }),
    });
    setAiBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setAiError(d.error || 'Generation failed');
      return;
    }
    const created: Blog = await res.json();
    setAiOpen(false);
    setAiTopic('');
    setAiCategory('');
    await load();
    startEdit(created); // open the new draft for review
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const badge = (text: string, cls: string) => (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${cls}`}>{text}</span>
  );

  // The editor form, reused for a new post and inside each accordion.
  const editor = (isNew: boolean) => (
    <div className={isNew ? 'p-6' : 'px-4 sm:px-6 pb-6 pt-2 border-t border-gray-100'}>
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
      )}
      <label className={label}>Title</label>
      <input className={`${input} mb-4`} value={draft.title ?? ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={label}>Category</label>
          <input className={input} value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Catholic, Public, …" />
        </div>
        <div>
          <label className={label}>Accent color</label>
          <input className={input} value={draft.color ?? ''} onChange={(e) => setDraft({ ...draft, color: e.target.value })} placeholder="#02176f" />
        </div>
      </div>

      <label className={label}>Summary</label>
      <textarea className={`${input} mb-4`} rows={2} value={draft.summary ?? ''} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />

      <label className={label}>Thumbnail URL</label>
      <input className={`${input} mb-4`} value={draft.thumbnail ?? ''} onChange={(e) => setDraft({ ...draft, thumbnail: e.target.value })} placeholder="https://…" />

      <label className={label}>Content (HTML)</label>
      <textarea className={`${input} mb-4 font-mono text-xs`} rows={12} value={draft.content ?? ''} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />

      <label className={label}>Embed HTML (optional)</label>
      <textarea className={`${input} mb-4 font-mono text-xs`} rows={3} value={draft.embedHtml ?? ''} onChange={(e) => setDraft({ ...draft, embedHtml: e.target.value })} />

      <div className="flex flex-wrap gap-5 mb-6 text-sm text-[#02176f]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.published !== false} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.featured === true} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} />
          Featured
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.starred === true} onChange={(e) => setDraft({ ...draft, starred: e.target.checked })} />
          Queue for newsletter
        </label>
      </div>

      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-5 py-2 rounded-md disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={cancel} className="px-5 py-2 rounded-md border border-[#dddddd] text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold whitespace-nowrap">Blog</h1>
          <nav className="flex items-center gap-1 shrink-0 whitespace-nowrap text-sm">
            <a href="/admin" className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="/admin/bot-knowledge" className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors">
              Knowledge base
            </a>
            <a href="/blog" target="_blank" className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors">
              View blog
            </a>
            <span className="mx-2 h-5 w-px bg-white/20" aria-hidden />
            <button onClick={logout} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-medium transition-colors">
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* Newsletter queue */}
        <section className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold">
              Newsletter queue <span className="text-gray-400 font-normal text-base">({starred.length})</span>
            </h2>
            {starred.length > 0 && (
              <div className="flex gap-2">
                <button onClick={() => setPreviewOpen(true)} className="text-sm px-3 py-1.5 rounded-md bg-[#02176f] text-white font-medium hover:bg-[#021a85]">
                  Preview
                </button>
                <button onClick={copyNewsletter} className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50">
                  Copy HTML
                </button>
                <button onClick={markNewsletterSent} className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50">
                  Mark sent
                </button>
              </div>
            )}
          </div>
          {starred.length === 0 ? (
            <p className="text-sm text-gray-500">Star posts below to queue them for the next newsletter.</p>
          ) : (
            <ul className="text-sm text-gray-700 list-disc pl-5 space-y-0.5">
              {starred.map((b) => (
                <li key={b.id}>{b.title}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">{items.length} post(s)</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAiOpen((v) => !v);
                setAiError('');
              }}
              className="border border-[#02176f] text-[#02176f] hover:bg-[#02176f]/5 font-semibold px-4 py-2 rounded-md"
            >
              Generate with AI
            </button>
            <button onClick={startNew} className="bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-4 py-2 rounded-md">
              New post
            </button>
          </div>
        </div>

        {/* AI generator */}
        {aiOpen && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-3">Generate a draft with AI</h2>
            {aiError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{aiError}</div>
            )}
            <label className={label}>Topic</label>
            <textarea
              className={`${input} mb-4`}
              rows={2}
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. How to boost teacher participation in your Catholic school book fair"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={label}>Category (optional)</label>
                <select className={input} value={aiCategory} onChange={(e) => setAiCategory(e.target.value)}>
                  <option value="">Let AI choose</option>
                  <option value="Catholic">Catholic</option>
                  <option value="Public">Public</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={generateAI} disabled={aiBusy} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-5 py-2 rounded-md disabled:opacity-60">
                {aiBusy ? 'Generating…' : 'Generate draft'}
              </button>
              <button onClick={() => setAiOpen(false)} className="px-5 py-2 rounded-md border border-[#dddddd] text-gray-700">
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">Creates an unpublished draft you can review and edit before publishing.</p>
          </div>
        )}

        {/* New post editor */}
        {editingId === 'new' && (
          <div className="bg-white rounded-xl shadow-sm">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold px-6 pt-5">New post</h2>
            {editor(true)}
          </div>
        )}

        {/* Posts — single-open accordions */}
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-500">No posts yet.</div>
        ) : (
          <div className="space-y-2.5">
            {items.map((b) => {
              const open = editingId === b.id;
              return (
                <div key={b.id} className="bg-white rounded-xl shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <button onClick={() => toggle(b)} className="flex-1 min-w-0 text-left flex items-center gap-2.5">
                      <Chevron open={open} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#02176f] truncate">{b.title}</span>
                          {b.publishedAt == null && badge('draft', 'bg-gray-200 text-gray-600')}
                          {b.archived && badge('archived', 'bg-gray-200 text-gray-600')}
                          {b.featured && badge('featured', 'bg-amber-100 text-amber-700')}
                          {b.starred && badge('queued', 'bg-blue-100 text-blue-700')}
                        </span>
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {b.category ? `${b.category} · ` : ''}/blog/{b.slug}
                          {b.newsletteredAt ? ' · sent in newsletter' : ''}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton title={b.starred ? 'Remove from newsletter queue' : 'Queue for newsletter'} onClick={() => toggleStar(b)} active={b.starred}>
                        <StarIcon filled={b.starred} />
                      </IconButton>
                      <a
                        href={`/admin/blog/promo/${b.id}`}
                        title="Promo kit"
                        aria-label="Promo kit"
                        className="grid place-items-center w-8 h-8 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#02176f] transition-colors"
                      >
                        <PromoIcon />
                      </a>
                      <IconButton title="Edit" onClick={() => toggle(b)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton title="Delete" onClick={() => remove(b.id)} danger>
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </div>
                  {open && editor(false)}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Newsletter preview modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-auto"
          onClick={() => setPreviewOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-brother text-[#02176f] font-semibold">
                Compose newsletter <span className="text-gray-400 font-normal">({starred.length})</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={copyNewsletter} className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50">
                  Copy HTML
                </button>
                <button onClick={() => setPreviewOpen(false)} className="text-sm px-3 py-1.5 rounded-md bg-[#02176f] text-white hover:bg-[#021a85]">
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[80vh] overflow-auto">
              {/* Compose */}
              <div className="p-5 space-y-4 border-b border-gray-100">
                {nlError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{nlError}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#02176f]">Title</span>
                      <button onClick={() => suggestNL('title')} disabled={nlBusy !== null} className="text-xs font-medium text-[#0066ff] hover:underline disabled:opacity-50">
                        {nlBusy === 'title' ? 'Suggesting…' : 'Suggest'}
                      </button>
                    </div>
                    <input className={input} value={nlTitle} onChange={(e) => setNlTitle(e.target.value)} placeholder="Summer Reading Roundup" />
                    {titleOpts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {titleOpts.map((o, i) => (
                          <button key={i} onClick={() => { setNlTitle(o); setTitleOpts([]); }} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50">
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-[#02176f] mb-1">Timeframe</span>
                    <input className={input} value={nlTimeframe} onChange={(e) => setNlTimeframe(e.target.value)} placeholder="July 2026" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#02176f]">Email subject</span>
                    <div className="flex gap-3">
                      {nlSubject && (
                        <button onClick={() => navigator.clipboard.writeText(nlSubject)} className="text-xs font-medium text-gray-500 hover:underline">
                          Copy
                        </button>
                      )}
                      <button onClick={() => suggestNL('subject')} disabled={nlBusy !== null} className="text-xs font-medium text-[#0066ff] hover:underline disabled:opacity-50">
                        {nlBusy === 'subject' ? 'Suggesting…' : 'Suggest'}
                      </button>
                    </div>
                  </div>
                  <input className={input} value={nlSubject} onChange={(e) => setNlSubject(e.target.value)} placeholder="This month’s reading picks from Ignatius Book Fairs" />
                  {subjectOpts.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2">
                      {subjectOpts.map((o, i) => (
                        <button key={i} onClick={() => { setNlSubject(o); setSubjectOpts([]); }} className="text-xs text-left px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50">
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#02176f]">Preamble</span>
                    <button onClick={() => suggestNL('preamble')} disabled={nlBusy !== null} className="text-xs font-medium text-[#0066ff] hover:underline disabled:opacity-50">
                      {nlBusy === 'preamble' ? 'Writing…' : 'Write with AI'}
                    </button>
                  </div>
                  <textarea rows={3} className={input} value={nlPreamble} onChange={(e) => setNlPreamble(e.target.value)} placeholder="A warm intro tying these articles together…" />
                </div>
              </div>

              {/* Live preview */}
              <div dangerouslySetInnerHTML={{ __html: newsletterHtml() }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
