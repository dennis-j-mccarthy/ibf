'use client';

import { useCallback, useEffect, useState } from 'react';
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

export default function BlogAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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

  const starred = items.filter((b) => b.starred);

  const startNew = () => {
    setDraft({ ...EMPTY });
    setEditingId('new');
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
    if (res.ok) load();
  };

  const toggleStar = async (b: Blog) => {
    await fetch(`/api/admin/blog/${b.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: !b.starred }),
    });
    load();
  };

  const markNewsletterSent = async () => {
    if (!confirm(`Mark the newsletter as sent? This clears all ${starred.length} starred post(s).`)) return;
    const res = await fetch('/api/admin/blog/newsletter-sent', { method: 'POST' });
    if (res.ok) load();
  };

  const copyNewsletter = async () => {
    const html = starred
      .map(
        (b) =>
          `<h2>${b.title}</h2>\n${b.summary ? `<p>${b.summary}</p>\n` : ''}<p><a href="https://www.ignatiusbookfairs.com/blog/${b.slug}">Read more →</a></p>`
      )
      .join('\n\n');
    await navigator.clipboard.writeText(html);
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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold whitespace-nowrap">Blog</h1>
          <nav className="flex items-center gap-1 shrink-0 whitespace-nowrap text-sm">
            <a
              href="/admin/bot-knowledge"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Knowledge base
            </a>
            <a
              href="/blog"
              target="_blank"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              View blog
            </a>
            <span className="mx-2 h-5 w-px bg-white/20" aria-hidden />
            <button
              onClick={logout}
              className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* Newsletter queue */}
        <section className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold">
              Newsletter queue <span className="text-gray-400 font-normal text-base">({starred.length})</span>
            </h2>
            {starred.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={copyNewsletter}
                  className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50"
                >
                  Copy HTML
                </button>
                <button
                  onClick={markNewsletterSent}
                  className="text-sm px-3 py-1.5 rounded-md bg-[#02176f] text-white font-medium hover:bg-[#021a85]"
                >
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
          {editingId === null && (
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
              <button
                onClick={startNew}
                className="bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-4 py-2 rounded-md"
              >
                New post
              </button>
            </div>
          )}
        </div>

        {/* AI generator */}
        {aiOpen && editingId === null && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-3">Generate a draft with AI</h2>
            {aiError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {aiError}
              </div>
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
              <button
                onClick={generateAI}
                disabled={aiBusy}
                className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-5 py-2 rounded-md disabled:opacity-60"
              >
                {aiBusy ? 'Generating…' : 'Generate draft'}
              </button>
              <button
                onClick={() => setAiOpen(false)}
                className="px-5 py-2 rounded-md border border-[#dddddd] text-gray-700"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Creates an unpublished draft you can review and edit before publishing.
            </p>
          </div>
        )}

        {/* Editor */}
        {editingId !== null && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-4">
              {editingId === 'new' ? 'New post' : 'Edit post'}
            </h2>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <label className={label}>Title</label>
            <input
              className={`${input} mb-4`}
              value={draft.title ?? ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={label}>Category</label>
                <input
                  className={input}
                  value={draft.category ?? ''}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="Catholic, Public, …"
                />
              </div>
              <div>
                <label className={label}>Accent color</label>
                <input
                  className={input}
                  value={draft.color ?? ''}
                  onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                  placeholder="#02176f"
                />
              </div>
            </div>

            <label className={label}>Summary</label>
            <textarea
              className={`${input} mb-4`}
              rows={2}
              value={draft.summary ?? ''}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
            />

            <label className={label}>Thumbnail URL</label>
            <input
              className={`${input} mb-4`}
              value={draft.thumbnail ?? ''}
              onChange={(e) => setDraft({ ...draft, thumbnail: e.target.value })}
              placeholder="https://…"
            />

            <label className={label}>Content (HTML)</label>
            <textarea
              className={`${input} mb-4 font-mono text-xs`}
              rows={12}
              value={draft.content ?? ''}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            />

            <label className={label}>Embed HTML (optional)</label>
            <textarea
              className={`${input} mb-4 font-mono text-xs`}
              rows={3}
              value={draft.embedHtml ?? ''}
              onChange={(e) => setDraft({ ...draft, embedHtml: e.target.value })}
            />

            <div className="flex flex-wrap gap-5 mb-6 text-sm text-[#02176f]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.published !== false}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
                Published
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.featured === true}
                  onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
                />
                Featured
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.starred === true}
                  onChange={(e) => setDraft({ ...draft, starred: e.target.checked })}
                />
                Queue for newsletter
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-5 py-2 rounded-md disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={cancel} className="px-5 py-2 rounded-md border border-[#dddddd] text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {items.length === 0 && <p className="p-6 text-gray-500">No posts yet.</p>}
            {items.map((b) => (
              <div key={b.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[#02176f] truncate">{b.title}</span>
                    {b.publishedAt == null && badge('draft', 'bg-gray-200 text-gray-600')}
                    {b.archived && badge('archived', 'bg-gray-200 text-gray-600')}
                    {b.featured && badge('featured', 'bg-amber-100 text-amber-700')}
                    {b.starred && badge('queued', 'bg-blue-100 text-blue-700')}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {b.category ? `${b.category} · ` : ''}/blog/{b.slug}
                    {b.newsletteredAt ? ' · sent in newsletter' : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => toggleStar(b)}
                    title={b.starred ? 'Remove from newsletter queue' : 'Queue for newsletter'}
                    className={`text-sm px-2.5 py-1.5 rounded-md border ${
                      b.starred
                        ? 'border-blue-200 text-blue-600 bg-blue-50'
                        : 'border-[#dddddd] text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => startEdit(b)}
                    className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(b.id)}
                    className="text-sm px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
