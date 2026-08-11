'use client';

import { useState } from 'react';
import HeaderIcon from './HeaderIcon';
import { TEMPLATE_KINDS, type TemplateKind } from '@/lib/templates/defaults';
import { toPlainText } from '@/lib/templates/format';
import { letterCss, letterFragment, letterPrintDocument } from '@/lib/templates/letter';

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
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
