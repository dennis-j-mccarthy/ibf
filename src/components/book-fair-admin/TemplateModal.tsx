'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TemplateKind } from '@/lib/templates/defaults';
import { TEMPLATE_KINDS } from '@/lib/templates/defaults';
import { toPlainText } from '@/lib/templates/format';
import { letterCss, letterFragment, letterPrintDocument } from '@/lib/templates/letter';
import { buildMailto, parseRecipients } from '@/lib/templates/recipients';

// The merged letter, its actions, and the coordinator's own send list. Shared
// by the Ready-to-send templates grid and the Fair Checklist, so a task on the
// timeline opens the same finished letter the template section does.

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

export default function TemplateModal({
  template,
  onClose,
  // Optional blank fill-in-the-blank original, kept available for coordinators
  // who want to hand-edit rather than use the merged version.
  blank,
}: {
  template: CoordinatorTemplate;
  onClose: () => void;
  blank?: { title: string; href: string } | null;
}) {
  const [copied, setCopied] = useState('');
  const [listOpen, setListOpen] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const flash = (what: string) => {
    setCopied(what);
    setTimeout(() => setCopied(''), 2000);
  };

  const copyText = async () => {
    await navigator.clipboard
      .writeText([template.subject, '', toPlainText(template.body)].join('\n').trim())
      .catch(() => {});
    flash('text');
  };

  // Rich copy: pastes with formatting into Gmail, Outlook, and Word, with a
  // plain-text flavor for everything else.
  const copyFormatted = async () => {
    const html = letterFragment(template, origin, 'email');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([toPlainText(template.body)], { type: 'text/plain' }),
        }),
      ]);
      flash('formatted');
    } catch {
      await navigator.clipboard.writeText(toPlainText(template.body)).catch(() => {});
      flash('text');
    }
  };

  // Prints from a hidden iframe rather than a popup, which pop-up blockers
  // would kill silently.
  const print = () => {
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
    doc.write(letterPrintDocument(template, origin));
    doc.close();
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    const pending = [...doc.images].filter((i) => !i.complete);
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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-3xl w-full my-8 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#eef0f5]">
          <div>
            <h4 className="text-[#02176f] font-semibold" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {template.name}
            </h4>
            <p className="text-xs text-[#7e828f] mt-0.5">{KIND_META[template.kind]?.label}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#7e828f] hover:text-[#02176f] text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-6 max-h-[62vh] overflow-y-auto bg-[#f7f8fb]">
          <div className="bg-white rounded-lg shadow-sm px-8 py-9">
            <style>{letterCss(origin)}</style>
            <div dangerouslySetInnerHTML={{ __html: letterFragment(template, origin, 'page') }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-[#eef0f5] bg-[#fafbfd]">
          <button
            onClick={print}
            className="bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
          >
            Print / save as PDF
          </button>
          <button
            onClick={copyFormatted}
            className="border border-[#dfe3ec] hover:border-[#0088ff] text-[#02176f] font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
          >
            {copied === 'formatted' ? 'Copied!' : 'Copy for email'}
          </button>
          <button onClick={copyText} className="text-sm font-semibold text-[#0088ff] hover:underline">
            {copied === 'text' ? 'Copied!' : 'Copy plain text'}
          </button>
          <button
            onClick={() => setListOpen((v) => !v)}
            className="text-sm font-semibold text-[#0088ff] hover:underline ml-auto"
          >
            {listOpen ? 'Hide my list' : 'Send to my list'}
          </button>
        </div>

        {blank && (
          <div className="px-6 py-3 border-t border-[#eef0f5] bg-white">
            <a
              href={blank.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#7e828f] hover:text-[#02176f]"
            >
              Prefer to fill it in yourself? Download the blank {blank.title} &rarr;
            </a>
          </div>
        )}

        {listOpen && <RecipientPanel template={template} onCopyHtml={copyFormatted} />}
      </div>
    </div>
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
        placeholder="Paste addresses here — commas, semicolons, or one per line. A spreadsheet column works too."
        className="w-full text-xs font-mono text-[#3a3f4b] bg-[#f7f9fc] border border-[#eef0f5] rounded-lg p-3 resize-y focus:outline-none focus:border-[#0088ff]"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs">
        <span className="font-semibold text-[#02176f]">
          {parsed.valid.length} {parsed.valid.length === 1 ? 'address' : 'addresses'}
        </span>
        {parsed.duplicates > 0 && <span className="text-[#7e828f]">{parsed.duplicates} duplicate removed</span>}
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
