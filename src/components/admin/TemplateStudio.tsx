'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TEMPLATE_KINDS, type TemplateKind } from '@/lib/templates/defaults';
import { SAMPLE_VALUES, TOKENS, renderTokens, unknownTokens } from '@/lib/templates/tokens';
import { toHtml } from '@/lib/templates/format';

// Template Studio — staff edit the marketing template library (parent letters,
// email copy, press releases, wishlist asks, flyers, social graphics) and see a
// live preview merged against a sample school. Coordinators get the same
// templates on their fair dashboard, merged against their real fair.

type Template = {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  audience: string;
  subject: string;
  body: string;
  route: '' | 'sign' | 'post' | 'header';
  params: Record<string, string>;
  order: number;
  customized: boolean;
  isActive: boolean;
};

const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';
const label = 'block text-sm font-medium text-[#02176f] mb-1';

const AUDIENCES = ['', 'Catholic In Person', 'Parish In Person', 'Public In Person'];
const KIND_LABEL = Object.fromEntries(TEMPLATE_KINDS.map((k) => [k.key, k.label])) as Record<string, string>;
const isVisual = (kind: TemplateKind) => TEMPLATE_KINDS.find((k) => k.key === kind)?.visual ?? false;

const blank = (kind: TemplateKind): Template => ({
  slug: '',
  kind,
  name: 'New template',
  description: '',
  audience: '',
  subject: '',
  body: isVisual(kind) ? '' : 'Dear Families,\n\n',
  route: isVisual(kind) ? (kind === 'flyer' ? 'sign' : 'post') : '',
  params: isVisual(kind)
    ? kind === 'flyer'
      ? { headline: 'Headline', sub: '{{school_name}}\n{{fair_dates}}', bg: '#02176f', qr: '{{shop_url}}', curve: 'wave' }
      : { theme: 'statement', statement: 'Headline', sub: '{{fair_dates}}', size: 'instagram', mode: 'catholic' }
    : {},
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
  // The field the token palette inserts into.
  const lastField = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Reloads the library and selects `selectSlug`, falling back to the first
  // parent letter on the initial load.
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

  const setParam = (key: string, value: string) =>
    setDraft((d) => (d ? { ...d, params: { ...d.params, [key]: value } } : d));

  const removeParam = (key: string) =>
    setDraft((d) => {
      if (!d) return d;
      const params = { ...d.params };
      delete params[key];
      return { ...d, params };
    });

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
    const name = el.dataset.field ?? 'body';
    if (name.startsWith('param:')) setParam(name.slice(6), next);
    else set(name as 'body' | 'subject', next);
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
  const previewSubject = draft ? renderTokens(draft.subject, SAMPLE_VALUES) : '';
  const previewHtml = draft ? toHtml(renderTokens(draft.body, SAMPLE_VALUES)) : '';
  const previewImg = useMemo(() => {
    if (!draft?.route) return '';
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(draft.params)) {
      const value = renderTokens(String(v ?? ''), SAMPLE_VALUES).trim();
      if (value) q.set(k, value);
    }
    return `/api/og/${draft.route}?${q.toString()}`;
  }, [draft]);

  const badTokens = draft ? unknownTokens(`${draft.subject}\n${draft.body}\n${Object.values(draft.params).join('\n')}`) : [];

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
          Fill-in-the-blank marketing pieces, turned into merge templates. Coordinators see these on their fair
          dashboard with their own school, dates, and links already filled in. Edit here and every school gets the
          new wording.
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
                  {t.customized && <span className="text-[#0088ff]"> · edited</span>}
                  {!t.isActive && <span className="text-[#ff6445]"> · hidden</span>}
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
              + New {KIND_LABEL[kind]?.toLowerCase().replace(/s$/, '') ?? 'template'}
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

                {!isVisual(draft.kind) ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className={label}>Renderer</label>
                      <select className={input} value={draft.route} onChange={(e) => set('route', e.target.value as Template['route'])}>
                        <option value="sign">Sign / flyer (8.5x11)</option>
                        <option value="post">Social post</option>
                        <option value="header">Email header</option>
                      </select>
                    </div>
                    <label className={label}>Design fields</label>
                    {Object.entries(draft.params).map(([k, v]) => (
                      <div key={k} className="flex gap-2 items-start">
                        <span className="w-28 shrink-0 text-xs font-mono text-[#7e828f] pt-2.5">{k}</span>
                        <input
                          className={input}
                          data-field={`param:${k}`}
                          value={v}
                          onChange={(e) => setParam(k, e.target.value)}
                          onFocus={(e) => { lastField.current = e.currentTarget; }}
                        />
                        <button
                          onClick={() => removeParam(k)}
                          className="text-[#7e828f] hover:text-[#ff6445] px-2 pt-2 text-sm"
                          title="Remove field"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <AddParam onAdd={(k) => setParam(k, '')} />
                  </div>
                )}

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
                {isVisual(draft.kind) ? (
                  previewImg && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImg} alt="" className="max-w-full mx-auto rounded-lg shadow-sm" style={{ maxHeight: 620 }} />
                  )
                ) : (
                  <article className="rounded-lg border border-[#eef0f5] bg-[#fcfdff] p-7 max-w-[640px] mx-auto">
                    {previewSubject && (
                      <p className="font-brother text-[#02176f] text-lg font-semibold mb-4 pb-3 border-b border-[#eef0f5]">
                        {previewSubject}
                      </p>
                    )}
                    <div className="tpl-body text-[15px] leading-relaxed text-[#1a1b1f]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </article>
                )}
              </section>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .tpl-body p { margin: 0 0 1em; }
        .tpl-body h3 { font-weight: 700; color: #02176f; margin: 1.4em 0 .5em; font-size: 15px; }
        .tpl-body ul { margin: 0 0 1em; padding-left: 1.2em; list-style: disc; }
        .tpl-body li { margin: .3em 0; }
      `}</style>
    </div>
  );
}

// Adds a new query param to a visual template.
function AddParam({ onAdd }: { onAdd: (key: string) => void }) {
  const [key, setKey] = useState('');
  return (
    <div className="flex gap-2">
      <input
        className={`${input} max-w-[220px]`}
        placeholder="Add a field (eyebrow, footer, bg...)"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && key.trim()) {
            onAdd(key.trim());
            setKey('');
          }
        }}
      />
      <button
        onClick={() => {
          if (key.trim()) {
            onAdd(key.trim());
            setKey('');
          }
        }}
        className="text-sm font-semibold text-[#0088ff] hover:underline"
      >
        Add field
      </button>
    </div>
  );
}
