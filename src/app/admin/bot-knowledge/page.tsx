'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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
};

const EMPTY: Omit<BotAnswer, 'id' | 'slug'> = {
  question: '',
  answer: '',
  links: [],
  audience: 'Both',
  category: '',
  order: 0,
  isActive: true,
};

export default function BotKnowledgeAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<BotAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Partial<BotAnswer>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState('');

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
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-brother text-xl font-semibold">Chatbot Knowledge Base</h1>
          <div className="flex items-center gap-4">
            <a href="/admin/fairs" className="text-sm underline opacity-90 hover:opacity-100">
              Upcoming Fairs
            </a>
            <a href="/bot-knowledge" target="_blank" className="text-sm underline opacity-90 hover:opacity-100">
              View source page
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-sm opacity-90">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Signed in as <strong className="font-semibold">{currentUser || '…'}</strong>
            </span>
            <button onClick={logout} className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-md font-medium">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6">
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
            <textarea
              className={`${inputCls} mb-4`}
              rows={5}
              value={draft.answer ?? ''}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-[#02176f] mb-1">Audience</label>
                <select
                  className={inputCls}
                  value={draft.audience ?? 'Both'}
                  onChange={(e) => setDraft({ ...draft, audience: e.target.value })}
                >
                  <option value="Both">Both</option>
                  <option value="Catholic">Catholic</option>
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
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#02176f] truncate">{item.question}</span>
                    {!item.isActive && (
                      <span className="text-[10px] uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                        inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{item.answer}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.audience || 'Both'}
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
