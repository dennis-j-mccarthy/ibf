'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { answerToText, SITE_SECTIONS, SITE_VERSIONS } from '@/lib/bot-knowledge';

type BotLink = { label: string; url: string };
type BotAnswer = {
  id: number;
  question: string;
  answer: string;
  slug: string;
  links: BotLink[] | null;
  audience: string | null;
  category: string | null;
  order: number;
  isActive: boolean;
  publishToSite: boolean;
  siteFeatured: boolean;
  siteVersion: string | null;
  siteCategory: string | null;
};

const EMPTY: Omit<BotAnswer, 'id' | 'slug'> = {
  question: '',
  answer: '',
  links: [],
  audience: 'All',
  category: '',
  order: 0,
  isActive: true,
  publishToSite: false,
  siteFeatured: false,
  siteVersion: null,
  siteCategory: null,
};

const PILL = 'text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors';

// The site's mode filter is one string, but it reads as two independent
// switches -- mirroring how the /faqs page's own tagging mode works.
const versionTags = (v: string | null) => ({
  catholic: v === 'Both' || v === 'Catholic',
  public: v === 'Both' || v === 'Public',
});

const fromVersionTags = (catholic: boolean, isPublic: boolean): string | null =>
  catholic && isPublic ? 'Both' : catholic ? 'Catholic' : isPublic ? 'Public' : null;

export default function BotKnowledgeAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<BotAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Partial<BotAnswer>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [tagBusy, setTagBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/bot-answers');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch('/api/admin/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCurrentUser(d.username))
      .catch(() => {});
  }, [load]);

  const startNew = () => {
    setDraft({ ...EMPTY, links: [] });
    setEditingId('new');
    setError('');
  };

  const startEdit = (item: BotAnswer) => {
    setDraft({ ...item, links: item.links ?? [] });
    setEditingId(item.id);
    setError('');
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
    setError('');
  };

  const save = async () => {
    if (!draft.question?.trim() || !draft.answer?.trim()) {
      setError('Question and answer are required.');
      return;
    }
    setSaving(true);
    setError('');
    const isNew = editingId === 'new';
    const res = await fetch(
      isNew ? '/api/admin/bot-answers' : `/api/admin/bot-answers/${editingId}`,
      {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: draft.question,
          answer: draft.answer,
          links: (draft.links ?? []).filter((l) => l.url.trim()),
          audience: draft.audience || null,
          category: draft.category || null,
          order: Number(draft.order) || 0,
          isActive: draft.isActive !== false,
          publishToSite: draft.publishToSite === true,
          siteFeatured: draft.siteFeatured === true,
          siteVersion: draft.siteVersion || null,
          siteCategory: draft.siteCategory || null,
        }),
      }
    );
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Save failed');
      return;
    }
    cancel();
    load();
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this answer? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/bot-answers/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  // Live tagging straight from the list — no need to open the editor to move an
  // answer between sections or modes. Applied optimistically and rolled back if
  // the save fails, so the row never shows a tag the database didn't accept.
  const tagInline = async (item: BotAnswer, patch: Partial<BotAnswer>) => {
    const before = item;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    setTagBusy(item.id);
    try {
      const res = await fetch(`/api/admin/bot-answers/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(String(res.status));
      // Trust the saved row over the guess, so the pill can never show a value
      // the database rejected or normalized differently.
      const saved = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...saved } : i)));
    } catch {
      // Covers a dropped connection too — without this the optimistic tag would
      // sit there looking saved when nothing had been written.
      setItems((prev) => prev.map((i) => (i.id === item.id ? before : i)));
      setError('That tag did not save, so it has been undone. Check your connection and try again.');
    } finally {
      setTagBusy(null);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  };

  const setLink = (i: number, field: keyof BotLink, value: string) => {
    const links = [...(draft.links ?? [])];
    links[i] = { ...links[i], [field]: value };
    setDraft({ ...draft, links });
  };
  const addLink = () => setDraft({ ...draft, links: [...(draft.links ?? []), { label: '', url: '' }] });
  const removeLink = (i: number) =>
    setDraft({ ...draft, links: (draft.links ?? []).filter((_, idx) => idx !== i) });

  const inputCls =
    'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff]';

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold whitespace-nowrap truncate">
            Chatbot Knowledge Base
          </h1>
          <nav className="flex items-center gap-1 shrink-0 whitespace-nowrap text-sm">
            <a
              href="/admin"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Dashboard
            </a>
            <a
              href="/admin/fairs"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Upcoming Fairs
            </a>
            <a
              href="/admin/blog"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Blog
            </a>
            <a
              href="/bot-knowledge"
              target="_blank"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              Source page
            </a>
            <span className="mx-2 h-5 w-px bg-white/20" aria-hidden />
            <span
              className="hidden md:inline-flex items-center gap-1.5 text-white/70 max-w-[220px]"
              title={`Signed in as ${currentUser}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{currentUser || '…'}</span>
            </span>
            <button
              onClick={logout}
              className="ml-1 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md font-medium transition-colors"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
        {/* Inline tagging happens outside the editor, so its failures need a
            banner here — otherwise a rolled-back tag just flickers silently. */}
        {error && editingId === null && (
          <div className="mb-4 flex items-start gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-700">
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">{items.length} answer(s)</p>
          {editingId === null && (
            <button
              onClick={startNew}
              className="bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-4 py-2 rounded-md"
            >
              Add answer
            </button>
          )}
        </div>

        {editingId !== null && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-4">
              {editingId === 'new' ? 'New answer' : 'Edit answer'}
            </h2>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <label className="block text-sm font-medium text-[#02176f] mb-1">Question</label>
            <input
              className={`${inputCls} mb-4`}
              value={draft.question ?? ''}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            />

            <label className="block text-sm font-medium text-[#02176f] mb-1">Answer</label>
            <div className="mb-4">
              <RichTextEditor
                value={draft.answer ?? ''}
                onChange={(html) => setDraft({ ...draft, answer: html })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#02176f] mb-1">Audience</label>
                <select
                  className={inputCls}
                  value={draft.audience ?? 'All'}
                  onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                >
                  {/* These are the values actually present in the data and
                      grouped by the chatbot feed. The old list offered
                      Both/Catholic/Public, none of which except Public exist,
                      so editing an entry silently retagged it. */}
                  <option value="All">All</option>
                  <option value="In-Person">In-Person</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Catholic School">Catholic School</option>
                  <option value="Parish">Parish</option>
                  <option value="Public">Public</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#02176f] mb-1">Category</label>
                <input
                  className={inputCls}
                  value={draft.category ?? ''}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="e.g. Pricing"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#02176f] mb-1">Order</label>
                <input
                  type="number"
                  className={inputCls}
                  value={draft.order ?? 0}
                  onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) })}
                />
              </div>
            </div>

            <label className="block text-sm font-medium text-[#02176f] mb-1">Resource links</label>
            <div className="space-y-2 mb-4">
              {(draft.links ?? []).map((link, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Label"
                    value={link.label}
                    onChange={(e) => setLink(i, 'label', e.target.value)}
                  />
                  <input
                    className={inputCls}
                    placeholder="https://…"
                    value={link.url}
                    onChange={(e) => setLink(i, 'url', e.target.value)}
                  />
                  <button
                    onClick={() => removeLink(i)}
                    className="px-3 text-gray-400 hover:text-red-600"
                    title="Remove link"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button onClick={addLink} type="button" className="text-sm text-[#0066ff] hover:underline">
                + Add link
              </button>
            </div>

            <label className="flex items-center gap-2 mb-6 text-sm text-[#02176f]">
              <input
                type="checkbox"
                checked={draft.isActive !== false}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
              />
              Active (visible to the chatbot)
            </label>

            {/* Website publishing. Separate from the chatbot fields above: an
                entry can serve the bot without ever appearing on the site. */}
            <div className="rounded-lg border border-[#e2e5ec] bg-[#fafbfc] p-4 mb-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#02176f]">
                <input
                  type="checkbox"
                  checked={draft.publishToSite === true}
                  onChange={(e) => setDraft({ ...draft, publishToSite: e.target.checked })}
                />
                Show on the website FAQ page
              </label>

              {draft.publishToSite && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#02176f] mb-1">Section</label>
                    <select
                      className={inputCls}
                      value={draft.siteCategory ?? ''}
                      onChange={(e) => setDraft({ ...draft, siteCategory: e.target.value || null })}
                    >
                      <option value="">Choose a section…</option>
                      {SITE_SECTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#02176f] mb-1">Show in mode</label>
                    <select
                      className={inputCls}
                      value={draft.siteVersion ?? ''}
                      onChange={(e) => setDraft({ ...draft, siteVersion: e.target.value || null })}
                    >
                      <option value="">Choose…</option>
                      {SITE_VERSIONS.map((v) => (
                        <option key={v} value={v}>{v === 'Both' ? 'Both (Catholic + Public)' : v}</option>
                      ))}
                    </select>
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm text-[#02176f]">
                    <input
                      type="checkbox"
                      checked={draft.siteFeatured === true}
                      onChange={(e) => setDraft({ ...draft, siteFeatured: e.target.checked })}
                    />
                    Also feature in the homepage FAQ block
                  </label>
                  {(!draft.siteCategory || !draft.siteVersion) && (
                    <p className="sm:col-span-2 text-xs text-[#b45309]">
                      Pick a section and a mode — without both, this answer will not
                      appear anywhere on the site.
                    </p>
                  )}
                </div>
              )}
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

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
            {items.length === 0 && <p className="p-6 text-gray-500">No answers yet. Add your first one.</p>}
            {items.map((item) => {
              const tags = versionTags(item.siteVersion);
              const busy = tagBusy === item.id;
              return (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#02176f] truncate">{item.question}</span>
                        {!item.isActive && (
                          <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            inactive
                          </span>
                        )}
                      </div>
                      {/* Answers may be rich text — show a markup-free preview. */}
                      <p className="text-sm text-gray-500 line-clamp-2">{answerToText(item.answer)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {item.audience || 'All'}
                        {item.category ? ` · ${item.category}` : ''}
                        {item.links?.length ? ` · ${item.links.length} link(s)` : ''}
                        {` · /bot-knowledge/${item.slug}`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(item)}
                        className="text-sm px-3 py-1.5 rounded-md border border-[#dddddd] text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="text-sm px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Live website tagging — each control saves on change. */}
                  <div
                    className={`mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2 transition-opacity ${
                      busy ? 'opacity-50' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        tagInline(item, {
                          publishToSite: !item.publishToSite,
                          // Turning it off clears the placement so a re-enabled
                          // answer can't silently reuse a stale section.
                          ...(item.publishToSite
                            ? { siteFeatured: false, siteVersion: null, siteCategory: null }
                            : {}),
                        })
                      }
                      className={`${PILL} ${
                        item.publishToSite
                          ? 'bg-[#e8f8ee] text-[#0a5c33] border-[#7fd6a4]'
                          : 'bg-white text-gray-500 border-[#dddddd]'
                      }`}
                    >
                      {item.publishToSite ? '● On the site' : '○ Not on the site'}
                    </button>

                    {item.publishToSite && (
                      <>
                        <select
                          value={item.siteCategory ?? ''}
                          onChange={(e) => tagInline(item, { siteCategory: e.target.value || null })}
                          className={`${PILL} ${
                            item.siteCategory
                              ? 'bg-white text-[#02176f] border-[#c9d4e6]'
                              : 'bg-[#fff4e5] text-[#b45309] border-[#f0c98a]'
                          }`}
                        >
                          <option value="">No section</option>
                          {SITE_SECTIONS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>

                        <span className="inline-flex rounded-full border border-[#c9d4e6] overflow-hidden">
                          <button
                            type="button"
                            title="Show in Catholic mode"
                            onClick={() =>
                              tagInline(item, { siteVersion: fromVersionTags(!tags.catholic, tags.public) })
                            }
                            className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                              tags.catholic ? 'bg-[#0088ff] text-white' : 'bg-white text-gray-400'
                            }`}
                          >
                            Catholic
                          </button>
                          <button
                            type="button"
                            title="Show in Public mode"
                            onClick={() =>
                              tagInline(item, { siteVersion: fromVersionTags(tags.catholic, !tags.public) })
                            }
                            className={`px-2.5 py-1 text-xs font-semibold border-l border-[#c9d4e6] transition-colors ${
                              tags.public ? 'bg-[#0088ff] text-white' : 'bg-white text-gray-400'
                            }`}
                          >
                            Public
                          </button>
                        </span>

                        <button
                          type="button"
                          title="Feature in the homepage FAQ block"
                          onClick={() => tagInline(item, { siteFeatured: !item.siteFeatured })}
                          className={`${PILL} ${
                            item.siteFeatured
                              ? 'bg-[#fff4e5] text-[#b45309] border-[#f0c98a]'
                              : 'bg-white text-gray-400 border-[#dddddd]'
                          }`}
                        >
                          {item.siteFeatured ? '★ Homepage' : '☆ Homepage'}
                        </button>

                        {(!item.siteCategory || !item.siteVersion) && (
                          <span className="text-xs text-[#b45309]">
                            {!item.siteCategory && !item.siteVersion
                              ? 'Needs a section and a mode to appear'
                              : !item.siteCategory
                                ? 'Needs a section to appear'
                                : 'Needs Catholic or Public to appear'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
