'use client';

import { useEffect, useMemo, useState } from 'react';
import HeaderIcon from './HeaderIcon';
import { TEMPLATE_KINDS, type TemplateKind } from '@/lib/templates/defaults';
import { toPlainText } from '@/lib/templates/format';
import { letterCss, letterFragment, letterPrintDocument } from '@/lib/templates/letter';
import { buildMailto, parseRecipients } from '@/lib/templates/recipients';

// Coordinator-facing template center. Everything here arrives already merged
// with this school's fair (server-side), so a coordinator copies or prints and
// is done — no blanks to fill in.

export interface CoordinatorTemplate {
  slug: string;
  kind: TemplateKind;
  name: string;
  description: string;
  subject: string;
  body: string;
  heroImage: string;
  heroScript: string;
  footerImage: string;
}

const KIND_META = Object.fromEntries(TEMPLATE_KINDS.map((k) => [k.key, k])) as Record<
  string,
  (typeof TEMPLATE_KINDS)[number]
>;

export default function TemplateCenter({ templates }: { templates: CoordinatorTemplate[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState('');
  const [listOpen, setListOpen] = useState(false);

  if (!templates.length) return null;

  const open = templates.find((t) => t.slug === openSlug) ?? null;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(''), 2000);
  };

  const copyText = async (t: CoordinatorTemplate) => {
    await navigator.clipboard.writeText([t.subject, '', toPlainText(t.body)].join('\n').trim()).catch(() => {});
    flash('text');
  };

  // Rich copy: pastes with formatting into Gmail, Outlook, and Word, with a
  // plain-text flavor for everything else.
  const copyFormatted = async (t: CoordinatorTemplate) => {
    const html = letterFragment(t, origin, 'email');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([toPlainText(t.body)], { type: 'text/plain' }),
        }),
      ]);
      flash('formatted');
    } catch {
      await navigator.clipboard.writeText(toPlainText(t.body)).catch(() => {});
      flash('text');
    }
  };

  // Prints from a hidden iframe rather than a popup, which pop-up blockers
  // would kill silently.
  const print = (t: CoordinatorTemplate) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(letterPrintDocument(t, origin));
    doc.close();
    // Wait for photos and webfonts so nothing is missing from the printout.
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    const imgs = [...doc.images];
    const pending = imgs.filter((i) => !i.complete);
    if (!pending.length) {
      setTimeout(go, 250);
      return;
    }
    let left = pending.length;
    const done = () => {
      if (--left <= 0) setTimeout(go, 150);
    };
    pending.forEach((i) => {
      i.addEventListener('load', done, { once: true });
      i.addEventListener('error', done, { once: true });
    });
    // Never hang if an image stalls.
    setTimeout(() => {
      if (left > 0) {
        left = 0;
        go();
      }
    }, 3500);
  };

  const grouped = TEMPLATE_KINDS.map((k) => ({
    kind: k,
    items: templates.filter((t) => t.kind === k.key),
  })).filter((g) => g.items.length > 0);

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold mb-1"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        <HeaderIcon name="templates" />
        Ready-to-send templates
      </h3>
      <p className="text-sm text-[#7e828f] mb-5">
        Every one of these is already filled in with your school, your dates, and your shopping link. Copy, print, or
        send.
      </p>

      <div className="space-y-6">
        {grouped.map(({ kind, items }) => (
          <div key={kind.key}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a0a4b0] mb-2.5">{kind.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((t) => (
                <button
                  key={t.slug}
                  onClick={() => setOpenSlug(t.slug)}
                  className="text-left rounded-xl border border-[#eef0f5] hover:border-[#0088ff] hover:shadow-sm bg-white overflow-hidden transition-all"
                >
                  {t.heroImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.heroImage} alt="" className="w-full h-24 object-cover bg-[#f5f6fa]" loading="lazy" />
                  )}
                  <span className="block p-4">
                    <span className="block text-sm font-semibold text-[#02176f]">{t.name}</span>
                    <span className="block text-xs text-[#7e828f] mt-1 leading-relaxed">{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpenSlug(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#eef0f5]">
              <div>
                <h4 className="text-[#02176f] font-semibold" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  {open.name}
                </h4>
                <p className="text-xs text-[#7e828f] mt-0.5">{KIND_META[open.kind]?.label}</p>
              </div>
              <button
                onClick={() => setOpenSlug(null)}
                className="text-[#7e828f] hover:text-[#02176f] text-2xl leading-none"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-6 max-h-[62vh] overflow-y-auto bg-[#f7f8fb]">
              <div className="bg-white rounded-lg shadow-sm px-8 py-9">
                <style>{letterCss(origin)}</style>
                <div dangerouslySetInnerHTML={{ __html: letterFragment(open, origin, 'page') }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-[#eef0f5] bg-[#fafbfd]">
              <button
                onClick={() => print(open)}
                className="bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
              >
                Print / save as PDF
              </button>
              <button
                onClick={() => copyFormatted(open)}
                className="border border-[#dfe3ec] hover:border-[#0088ff] text-[#02176f] font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
              >
                {copied === 'formatted' ? 'Copied!' : 'Copy for email'}
              </button>
              <button onClick={() => copyText(open)} className="text-sm font-semibold text-[#0088ff] hover:underline">
                {copied === 'text' ? 'Copied!' : 'Copy plain text'}
              </button>
              <button
                onClick={() => setListOpen((v) => !v)}
                className="text-sm font-semibold text-[#0088ff] hover:underline ml-auto"
              >
                {listOpen ? 'Hide my list' : 'Send to my list'}
              </button>
            </div>

            {listOpen && <RecipientPanel template={open} onCopyHtml={() => copyFormatted(open)} />}
          </div>
        </div>
      )}
    </section>
  );
}

// Builds a ready-to-send draft in the coordinator's own mail client. We do not
// send on their behalf on purpose: mail from the school's own address lands
// better with parents than mail from a vendor domain, and their address list
// never touches our servers.
const STORAGE_KEY = 'ibf-bfa-recipients';

function RecipientPanel({
  template,
  onCopyHtml,
}: {
  template: CoordinatorTemplate;
  onCopyHtml: () => void;
}) {
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');

  // Remembered in this browser so the list survives switching templates.
  useEffect(() => {
    try {
      setRaw(localStorage.getItem(STORAGE_KEY) ?? '');
    } catch {
      /* private browsing */
    }
  }, []);

  const update = (v: string) => {
    setRaw(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* private browsing */
    }
  };

  const parsed = useMemo(() => parseRecipients(raw), [raw]);
  const plan = useMemo(
    () => buildMailto(parsed.valid, template.subject, toPlainText(template.body)),
    [parsed.valid, template.subject, template.body]
  );

  const openDraft = () => {
    if (!parsed.valid.length) return;
    if (plan.tooManyRecipients) {
      navigator.clipboard.writeText(parsed.valid.join(', ')).catch(() => {});
      setNote(
        `That is more addresses than a mail app will accept in one link, so we opened an empty draft instead. All ${parsed.valid.length} addresses are on your clipboard — paste them into BCC, then use "Copy for email" above to paste the letter itself.`
      );
    } else if (plan.bodyOmitted) {
      onCopyHtml();
      setNote('Draft opened with everyone in BCC. The letter is on your clipboard — paste it into the message body.');
    } else {
      setNote('Draft opened in your email app with everyone in BCC. Review it, then send.');
    }
    window.location.href = plan.href;
  };

  const copyAddresses = async () => {
    await navigator.clipboard.writeText(parsed.valid.join(', ')).catch(() => {});
    setNote(`${parsed.valid.length} addresses copied. Paste them into the BCC field of a new message.`);
  };

  return (
    <div className="px-6 py-5 border-t border-[#eef0f5] bg-white">
      <p className="text-sm font-semibold text-[#02176f] mb-1">Send this from your own email</p>
      <p className="text-xs text-[#7e828f] mb-3 leading-relaxed">
        Paste your addresses below and we will open a draft in your email app with everyone in BCC. It sends from
        your school account, so families recognize the sender &mdash; and your list never leaves this browser.
      </p>
      <textarea
        value={raw}
        onChange={(e) => update(e.target.value)}
        rows={4}
        placeholder="Paste addresses here &mdash; commas, semicolons, or one per line. A spreadsheet column works too."
        className="w-full text-xs font-mono text-[#3a3f4b] bg-[#f7f9fc] border border-[#eef0f5] rounded-lg p-3 resize-y focus:outline-none focus:border-[#0088ff]"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
        <span className="font-semibold text-[#02176f]">
          {parsed.valid.length} {parsed.valid.length === 1 ? 'address' : 'addresses'}
        </span>
        {parsed.duplicates > 0 && (
          <span className="text-[#7e828f]">{parsed.duplicates} duplicate removed</span>
        )}
        {parsed.invalid.length > 0 && (
          <span className="text-[#ff6445]">
            {parsed.invalid.length} not usable: {parsed.invalid.slice(0, 3).join(', ')}
            {parsed.invalid.length > 3 ? '...' : ''}
          </span>
        )}
        {plan.tooManyRecipients && (
          <span className="text-[#7e828f]">
            too many for one draft &mdash; we will put them on your clipboard to paste into BCC
          </span>
        )}
        {!plan.tooManyRecipients && plan.bodyOmitted && (
          <span className="text-[#7e828f]">draft will carry the addresses; the letter goes on your clipboard</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          onClick={openDraft}
          disabled={!parsed.valid.length}
          className="bg-[#02176f] hover:bg-[#001456] disabled:opacity-40 text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
        >
          Open draft in my email app
        </button>
        <button
          onClick={copyAddresses}
          disabled={!parsed.valid.length}
          className="text-sm font-semibold text-[#0088ff] hover:underline disabled:opacity-40"
        >
          Copy addresses instead
        </button>
      </div>

      {note && <p className="text-xs text-[#02176f] mt-3 leading-relaxed">{note}</p>}
    </div>
  );
}
