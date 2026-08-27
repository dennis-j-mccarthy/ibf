'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_FIELDS,
  buildSignatureHtml,
  type SignatureFields,
} from '@/lib/signature';

// Branded email signature builder for staff. Fill in your details, copy, paste.
// The generated HTML is table-based with inline styles so it survives Gmail and
// Outlook (see src/lib/signature.ts). Entries persist in this browser only --
// no shared table, so each staffer keeps their own.

const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';
const label = 'block text-sm font-medium text-[#02176f] mb-1';
const STORAGE_KEY = 'ibf-signature-fields';

const CLIENTS = [
  {
    key: 'gmail',
    label: 'Gmail',
    steps: [
      'Click "Copy signature" above.',
      'In Gmail, open Settings (gear icon) and choose "See all settings".',
      'Scroll to Signature, then click Create new (or pick an existing one).',
      'Click into the signature box and paste with Ctrl+V / Cmd+V.',
      'Scroll to the bottom and click Save Changes.',
    ],
    note: 'Paste into the signature box itself, not a Compose window. Gmail keeps the images because they are hosted on our site.',
  },
  {
    key: 'outlook-web',
    label: 'Outlook on the web',
    steps: [
      'Click "Copy signature" above.',
      'In Outlook, open Settings (gear icon) then Mail, then Compose and reply.',
      'Click into the signature editor and paste with Ctrl+V / Cmd+V.',
      'Choose whether it applies to new messages and replies, then click Save.',
    ],
    note: 'If the layout looks cramped right after pasting, save and send yourself a test -- the editor preview is narrower than a real message.',
  },
  {
    key: 'outlook-desktop',
    label: 'Outlook desktop',
    steps: [
      'Click "Copy signature" above.',
      'In Outlook go to File, Options, Mail, Signatures.',
      'Create a new signature, click into the editor, and paste with Ctrl+V.',
      'Select it for new messages and replies, then click OK.',
    ],
    note: 'On Mac: Outlook Settings, Signatures, then paste into a new signature the same way.',
  },
];

export default function SignatureMaker() {
  const [f, setF] = useState<SignatureFields>(DEFAULT_FIELDS);
  const [copied, setCopied] = useState('');
  const [client, setClient] = useState('gmail');
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe
      // localStorage hydration: a lazy useState initializer would touch
      // localStorage during server render and mismatch on hydrate.
      if (saved) setF({ ...DEFAULT_FIELDS, ...JSON.parse(saved), brand: 'ibf' });
    } catch {
      /* first run */
    }
  }, []);

  // 10 digits -> 888-771-2321 as you type; tolerates a leading 1.
  const fmtPhone = (v: string) => {
    let d = v.replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
    d = d.slice(0, 10);
    if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return d;
  };

  const set = <K extends keyof SignatureFields>(key: K, value: SignatureFields[K]) =>
    setF((cur) => {
      const next = { ...cur, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* private browsing */
      }
      return next;
    });

  const html = useMemo(() => buildSignatureHtml(f), [f]);
  const ready = f.firstName.trim() !== '' || f.lastName.trim() !== '';

  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(''), 2200);
  };

  // Rich copy so the signature pastes formatted straight into Gmail/Outlook.
  const copySignature = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([`${f.firstName} ${f.lastName}\n${f.title}\n${f.email}`], { type: 'text/plain' }),
        }),
      ]);
      flash('sig');
    } catch {
      setShowSource(true);
      flash('failed');
    }
  };

  const copySource = async () => {
    await navigator.clipboard.writeText(html).catch(() => {});
    flash('src');
  };


  const active = CLIENTS.find((c) => c.key === client) ?? CLIENTS[0];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Signature Maker</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">
            Back to admin
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <p className="text-sm text-gray-600 -mt-2">
          Build your branded email signature, then copy it into Gmail or Outlook. Your details are remembered in this
          browser so you can come back and tweak them.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Fields */}
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>First name</label>
                <input className={input} value={f.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Julie" />
              </div>
              <div>
                <label className={label}>Last name</label>
                <input className={input} value={f.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="DeGregoria" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-4">
              <div>
                <label className={label}>Title</label>
                <input className={input} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Book Fair Consultant" />
              </div>
              <div>
                <label className={label}>Credentials</label>
                <input className={input} value={f.credentials} onChange={(e) => set('credentials', e.target.value)} placeholder="M.Ed." />
              </div>
            </div>

            <div>
              <label className={label}>Email</label>
              <input className={input} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@ignatiusbookfairs.com" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] gap-4">
              <div>
                <label className={label}>Office phone</label>
                <input className={input} value={f.phone} onChange={(e) => set('phone', fmtPhone(e.target.value))} />
              </div>
              <div>
                <label className={label}>Extension</label>
                <input className={input} value={f.phoneExt} onChange={(e) => set('phoneExt', e.target.value)} placeholder="104" />
              </div>
            </div>

            <div>
              <label className={label}>Mobile (optional)</label>
              <input className={input} value={f.mobile} onChange={(e) => set('mobile', fmtPhone(e.target.value))} placeholder="239-555-0134" />
            </div>

            <div>
              <label className={label}>Link (optional)</label>
              <input className={input} value={f.bookingUrl} onChange={(e) => set('bookingUrl', e.target.value)} placeholder="https://meetings.hubspot.com/..." />
            </div>

            <div>
              <label className={label}>Link title</label>
              <input className={input} value={f.linkTitle} onChange={(e) => set('linkTitle', e.target.value)} placeholder="Book a time with me" />
            </div>

            <div>
              <label className={label}>Tagline (optional)</label>
              <input className={input} value={f.tagline} onChange={(e) => set('tagline', e.target.value)} />
            </div>


            <div className="flex flex-wrap items-center gap-5 border-t border-[#eef0f5] pt-4">
              <div>
                <span className="text-sm font-medium text-[#02176f] mr-3">Layout</span>
                <div className="inline-flex bg-[#f5f6fa] rounded-full p-1">
                  {(['side', 'stacked'] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => set('layout', l)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
                        f.layout === l ? 'bg-[#0088ff] text-white' : 'text-[#7e828f]'
                      }`}
                    >
                      {l === 'side' ? 'Side by side' : 'Stacked'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Preview + actions */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-3">Preview</p>
              <div className="rounded-lg border border-[#eef0f5] bg-white p-6 overflow-x-auto">
                {ready ? (
                  <div dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <p className="text-sm text-[#a0a4b0]">Enter your name to see your signature.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={copySignature}
                  disabled={!ready}
                  className="bg-[#0088ff] hover:bg-[#0070d8] disabled:opacity-40 text-white font-semibold rounded-full py-2.5 px-6 text-sm transition-colors"
                >
                  {copied === 'sig' ? 'Copied!' : 'Copy signature'}
                </button>
                <button
                  onClick={copySource}
                  disabled={!ready}
                  className="border border-[#dfe3ec] hover:border-[#0088ff] disabled:opacity-40 text-[#02176f] font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
                >
                  {copied === 'src' ? 'HTML copied!' : 'Copy HTML'}
                </button>
                <button onClick={() => setShowSource((v) => !v)} className="text-sm font-semibold text-[#0088ff] hover:underline">
                  {showSource ? 'Hide HTML' : 'Show HTML'}
                </button>
              </div>
              {copied === 'failed' && (
                <p className="text-sm text-[#ff6445] mt-3">
                  This browser blocked the rich copy. Use Show HTML and paste the source instead.
                </p>
              )}

              {showSource && (
                <div className="mt-4">
                  <textarea
                    readOnly
                    value={html}
                    rows={10}
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full text-xs font-mono text-[#3a3f4b] bg-[#f7f9fc] border border-[#eef0f5] rounded-lg p-3 resize-none focus:outline-none focus:border-[#0088ff]"
                  />
                  <button onClick={copySource} className="mt-2 text-sm font-semibold text-[#0088ff] hover:underline">
                    {copied === 'src' ? 'HTML copied!' : 'Copy HTML source'}
                  </button>
                </div>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-3">How to install it</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {CLIENTS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setClient(c.key)}
                    className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-colors ${
                      client === c.key ? 'bg-[#02176f] text-white' : 'bg-[#f5f6fa] text-[#7e828f] hover:text-[#02176f]'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <ol className="space-y-2 text-sm text-[#3a3f4b] list-decimal pl-5">
                {active.steps.map((s) => (
                  <li key={s} className="leading-relaxed">{s}</li>
                ))}
              </ol>
              <p className="text-xs text-[#7e828f] mt-4 leading-relaxed border-t border-[#eef0f5] pt-3">{active.note}</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
