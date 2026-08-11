'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { LETTER_PHOTOS, TEMPLATE_KINDS, type TemplateKind } from '@/lib/templates/defaults';
import { SAMPLE_VALUES, TOKENS, renderTokens, unknownTokens } from '@/lib/templates/tokens';
import { letterCss, letterFragment } from '@/lib/templates/letter';

// Template Studio — staff edit the marketing copy library (letters, email,
// announcements, press releases, wishlist asks) and see the finished, designed
// letter merged against a sample school. Coordinators get the same templates on
// their fair dashboard, merged against their real fair.
//
// Printed collateral and social graphics are deliberately not here: Sign Maker
// and Social Posts own those.

type Template = {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  audience: string;
  subject: string;
  body: string;
  heroImage: string;
  heroScript: string;
  footerImage: string;
  order: number;
  customized: boolean;
  isActive: boolean;
};

const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';
const label = 'block text-sm font-medium text-[#02176f] mb-1';

const AUDIENCES = ['', 'Catholic In Person', 'Parish In Person', 'Public In Person'];
const KIND_LABEL = Object.fromEntries(TEMPLATE_KINDS.map((k) => [k.key, k.label])) as Record<string, string>;

const blank = (kind: TemplateKind): Template => ({
  slug: '',
  kind,
  name: 'New template',
  description: '',
  audience: '',
  subject: '',
  body: 'Dear Families,\n\n',
  heroImage: '',
  heroScript: '',
  footerImage: '',
  order: 99,
  customized: true,
  isActive: true,
});

export default function TemplateStudio() {
  const [all, setAll] = useState<Template[]>([]);
  const [kind, setKind] = useState<TemplateKind>('parent-letter');
  const [slug, setSlug] = useState('');
  const [draft, setDraft] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [picking, setPicking] = useState<'heroImage' | 'footerImage' | null>(null);
  // The field the token palette inserts into.
  const lastField = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Reloads the library and selects `selectSlug`, falling back to the first
  // letter on the initial load.
  const load = (selectSlug?: string) =>
    fetch('/api/admin/templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Template[]) => {
        setAll(list);
        const found = selectSlug
          ? list.find((t) => t.slug === selectSlug)
          : (list.find((t) => t.kind === 'parent-letter') ?? list[0]);
        if (found) {
          setSlug(found.slug);
          setDraft(structuredClone(found));
        }
      })
      .catch(() => {});

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inKind = useMemo(() => all.filter((t) => t.kind === kind).sort((a, b) => a.order - b.order), [all, kind]);

  const select = (t: Template) => {
    setSlug(t.slug);
    setDraft(structuredClone(t));
    setMsg('');
  };

  const set = <K extends keyof Template>(key: K, value: Template[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  // Insert {{token}} at the cursor of whichever field was last focused.
  const insertToken = (key: string) => {
    const el = lastField.current;
    const snippet = `{{${key}}}`;
    if (!el) {
      setDraft((d) => (d ? { ...d, body: d.body + snippet } : d));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + snippet + el.value.slice(end);
    set((el.dataset.field ?? 'body') as 'body' | 'subject', next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  };

  const save = async () => {
    if (!draft) return;
    const slugToSave = draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slugToSave) {
      setMsg('Give the template a name first.');
      return;
    }
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/admin/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, slug: slugToSave }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const err = res ? await res.json().catch(() => null) : null;
      setMsg(err?.error ?? 'Save failed. If this is the first save, the Template table may not exist yet.');
      return;
    }
    setMsg('Saved. Coordinators see this version now.');
    await load(slugToSave);
  };

  const resetToDefault = async () => {
    if (!draft?.slug) return;
    setBusy(true);
    await fetch(`/api/admin/templates?slug=${encodeURIComponent(draft.slug)}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    setMsg('Reverted to the built-in version.');
    await load(draft.slug);
  };

  // --- Preview, merged against the sample school ---
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const preview = useMemo(
    () =>
      draft
        ? letterFragment(
            {
              name: draft.name,
              subject: renderTokens(draft.subject, SAMPLE_VALUES),
              body: renderTokens(draft.body, SAMPLE_VALUES),
              heroImage: draft.heroImage,
              heroScript: renderTokens(draft.heroScript, SAMPLE_VALUES),
              footerImage: draft.footerImage,
            },
            origin,
            'page'
          )
        : '',
    [draft, origin]
  );

  const badTokens = draft ? unknownTokens(`${draft.subject}\n${draft.body}\n${draft.heroScript}`) : [];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Template Studio</h1>
          <div className="flex items-center gap-2">
            <a href="/admin/templates/preview" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
              Coordinator view
            </a>
            <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-5">
        <p className="text-sm text-gray-600 -mt-2">
          Fill-in-the-blank marketing copy, turned into merge templates. Coordinators see these on their fair dashboard
          with their own school, dates, and links already filled in. Printed collateral lives in{' '}
          <a href="/admin/sign-maker" className="text-[#0066ff] hover:underline">Sign Maker</a> and graphics in{' '}
          <a href="/admin/social" className="text-[#0066ff] hover:underline">Social Posts</a>.
        </p>

        {/* Kind chips */}
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_KINDS.map((k) => {
            const count = all.filter((t) => t.kind === k.key).length;
            const active = k.key === kind;
            return (
              <button
                key={k.key}
                onClick={() => {
                  setKind(k.key);
                  const first = all.filter((t) => t.kind === k.key).sort((a, b) => a.order - b.order)[0];
                  if (first) select(first);
                }}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active ? 'bg-[#02176f] text-white' : 'bg-white text-[#7e828f] hover:text-[#02176f] shadow-sm'
                }`}
              >
                {k.label}
                <span className={`ml-2 text-xs ${active ? 'text-white/60' : 'text-[#a0a4b0]'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start">
          {/* Template list */}
          <aside className="bg-white rounded-xl shadow-sm p-3 space-y-1">
            {inKind.map((t) => (
              <button
                key={t.slug}
                onClick={() => select(t)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                  t.slug === slug ? 'bg-[#eef4ff] text-[#02176f]' : 'hover:bg-[#f5f6fa] text-[#3a3f4b]'
                }`}
              >
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-[#7e828f] mt-0.5">
                  {t.audience || 'All fair types'}
                  {t.customized && <span className="text-[#0088ff]"> &middot; edited</span>}
                  {!t.isActive && <span className="text-[#ff6445]"> &middot; hidden</span>}
                </span>
              </button>
            ))}
            <button
              onClick={() => {
                setSlug('');
                setDraft(blank(kind));
                setMsg('');
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0088ff] hover:bg-[#f5f6fa]"
            >
              + New {(KIND_LABEL[kind] ?? 'template').toLowerCase().replace(/s$/, '')}
            </button>
          </aside>

          {/* Editor + preview */}
          {draft && (
            <div className="space-y-5">
              <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Template name</label>
                    <input className={input} value={draft.name} onChange={(e) => set('name', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>Shown to</label>
                    <select className={input} value={draft.audience} onChange={(e) => set('audience', e.target.value)}>
                      {AUDIENCES.map((a) => (
                        <option key={a} value={a}>{a || 'All fair types'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={label}>Description</label>
                  <input
                    className={input}
                    value={draft.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="One line telling the coordinator when to use this."
                  />
                </div>

                <div>
                  <label className={label}>{draft.kind === 'email' ? 'Subject line' : 'Headline'}</label>
                  <input
                    className={input}
                    data-field="subject"
                    value={draft.subject}
                    onChange={(e) => set('subject', e.target.value)}
                    onFocus={(e) => { lastField.current = e.currentTarget; }}
                  />
                </div>

                <div>
                  <label className={label}>Body</label>
                  <textarea
                    className={`${input} font-mono text-[13px] leading-relaxed`}
                    data-field="body"
                    rows={18}
                    value={draft.body}
                    onChange={(e) => set('body', e.target.value)}
                    onFocus={(e) => { lastField.current = e.currentTarget; }}
                  />
                  <p className="text-xs text-[#7e828f] mt-1.5">
                    Markup: <code>## Heading</code>, <code>- bullet</code>, <code>**bold**</code>, blank line for a new
                    paragraph.
                  </p>
                </div>

                {/* Artwork */}
                <div className="border-t border-[#eef0f5] pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0]">Artwork</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ImageSlot
                      title="Masthead photo"
                      value={draft.heroImage}
                      onPick={() => setPicking('heroImage')}
                      onClear={() => set('heroImage', '')}
                    />
                    <ImageSlot
                      title="Sign-off photo"
                      value={draft.footerImage}
                      onPick={() => setPicking('footerImage')}
                      onClear={() => set('footerImage', '')}
                    />
                  </div>
                  <div>
                    <label className={label}>Script word over the photo</label>
                    <input
                      className={`${input} max-w-[280px]`}
                      value={draft.heroScript}
                      onChange={(e) => set('heroScript', e.target.value)}
                      placeholder="Coming Soon!"
                    />
                  </div>
                </div>

                {/* Token palette */}
                <div className="border-t border-[#eef0f5] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-2">
                    Merge fields &mdash; click to insert
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TOKENS.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => insertToken(t.key)}
                        title={`${t.help} Example: ${t.sample}`}
                        className="px-2.5 py-1 rounded-full bg-[#f5f6fa] hover:bg-[#e6efff] text-[#3a3f4b] hover:text-[#02176f] text-xs font-mono transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {badTokens.length > 0 && (
                    <p className="text-xs text-[#ff6445] mt-2.5">
                      Not a merge field: {badTokens.map((b) => `{{${b}}}`).join(', ')} &mdash; it will print as-is.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-[#eef0f5] pt-4">
                  <button
                    onClick={save}
                    disabled={busy}
                    className="bg-[#0088ff] hover:bg-[#0070d8] disabled:opacity-50 text-white font-semibold rounded-full py-2.5 px-6 text-sm transition-colors"
                  >
                    {busy ? 'Saving...' : 'Save template'}
                  </button>
                  {draft.customized && draft.slug && (
                    <button onClick={resetToDefault} disabled={busy} className="text-sm font-semibold text-[#7e828f] hover:text-[#02176f]">
                      Reset to default
                    </button>
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
                    <input type="checkbox" checked={draft.isActive} onChange={(e) => set('isActive', e.target.checked)} />
                    Visible to coordinators
                  </label>
                </div>
                {msg && <p className="text-sm text-[#02176f]">{msg}</p>}
              </section>

              {/* Preview */}
              <section className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="font-brother text-[#02176f] font-semibold">Preview</h2>
                  <span className="text-xs text-[#7e828f]">merged with a sample school</span>
                </div>
                <div className="bg-[#f7f8fb] rounded-lg p-6">
                  <div className="bg-white rounded-lg shadow-sm px-8 py-9">
                    <style>{letterCss(origin)}</style>
                    <div dangerouslySetInnerHTML={{ __html: preview }} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {picking && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setPicking(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#eef0f5] sticky top-0 bg-white">
              <h4 className="font-brother text-[#02176f] font-semibold">Choose a photo</h4>
              <button onClick={() => setPicking(null)} className="text-[#7e828f] hover:text-[#02176f] text-2xl leading-none" aria-label="Close">
                &times;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">
              {LETTER_PHOTOS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    set(picking, p);
                    setPicking(null);
                  }}
                  className="rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0088ff] transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="w-full h-24 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImageSlot({
  title,
  value,
  onPick,
  onClear,
}: {
  title: string;
  value: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className={label}>{title}</label>
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-[#eef0f5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-24 object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex gap-3 bg-black/45 px-3 py-1.5">
            <button onClick={onPick} className="text-xs font-semibold text-white hover:underline">Change</button>
            <button onClick={onClear} className="text-xs font-semibold text-white/80 hover:underline">Remove</button>
          </div>
        </div>
      ) : (
        <button
          onClick={onPick}
          className="w-full h-24 rounded-lg border-2 border-dashed border-[#dfe3ec] text-sm font-semibold text-[#7e828f] hover:border-[#0088ff] hover:text-[#02176f] transition-colors"
        >
          + Add photo
        </button>
      )}
    </div>
  );
}
