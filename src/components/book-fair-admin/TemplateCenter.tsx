'use client';

import { useState } from 'react';
import HeaderIcon from './HeaderIcon';
import { TEMPLATE_KINDS, type TemplateKind } from '@/lib/templates/defaults';
import { toHtml, toPlainText } from '@/lib/templates/format';

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
  imageUrl: string;
}

const KIND_META = Object.fromEntries(TEMPLATE_KINDS.map((k) => [k.key, k])) as Record<
  string,
  (typeof TEMPLATE_KINDS)[number]
>;

// Letterhead wrapper used for print and for rich-clipboard copy, with inline
// styles only — Gmail, Outlook, and Word all strip <style> blocks.
function letterheadHtml(t: CoordinatorTemplate, origin: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1a1b1f;max-width:640px">
<img src="${origin}/images/ibf-logo-blue.png" alt="Ignatius Book Fairs" width="200" style="display:block;margin:0 0 24px" />
${t.subject ? `<h2 style="font-family:Arial,Helvetica,sans-serif;color:#02176f;font-size:19px;margin:0 0 18px">${t.subject}</h2>` : ''}
${toHtml(t.body)
  .replace(/<p>/g, '<p style="margin:0 0 1em">')
  .replace(/<h3>/g, '<h3 style="color:#02176f;font-size:16px;margin:1.4em 0 .5em">')
  .replace(/<ul>/g, '<ul style="margin:0 0 1em;padding-left:20px">')
  .replace(/<li>/g, '<li style="margin:.3em 0">')}
</div>`;
}

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
    const text = [t.subject, '', toPlainText(t.body)].filter((s) => s !== undefined).join('\n');
    await navigator.clipboard.writeText(text.trim()).catch(() => {});
    flash('text');
  };

  // Rich copy: pastes with formatting into Gmail, Outlook, and Word, with a
  // plain-text flavor for everything else.
  const copyFormatted = async (t: CoordinatorTemplate) => {
    const html = letterheadHtml(t, origin);
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
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${t.name}</title>` +
        `<style>@page{margin:0.75in}body{margin:0}</style></head><body>${letterheadHtml(t, origin)}</body></html>`
    );
    doc.close();
    // Wait for the letterhead logo so it isn't missing from the printout.
    const go = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1000);
    };
    const img = doc.querySelector('img');
    if (img && !img.complete) {
      img.addEventListener('load', go, { once: true });
      img.addEventListener('error', go, { once: true });
    } else {
      setTimeout(go, 100);
    }
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
        download and send.
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
                  className="text-left rounded-xl border border-[#eef0f5] hover:border-[#0088ff] hover:shadow-sm bg-white p-4 transition-all"
                >
                  {kind.visual && t.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.imageUrl}
                      alt=""
                      className="w-full h-28 object-cover object-top rounded-lg mb-3 bg-[#f5f6fa]"
                      loading="lazy"
                    />
                  )}
                  <span className="block text-sm font-semibold text-[#02176f]">{t.name}</span>
                  <span className="block text-xs text-[#7e828f] mt-1 leading-relaxed">{t.description}</span>
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

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {open.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.imageUrl} alt="" className="max-w-full mx-auto rounded-lg shadow-sm" />
              ) : (
                <article className="rounded-lg border border-[#eef0f5] bg-[#fcfdff] p-7">
                  {open.subject && (
                    <p
                      className="text-[#02176f] text-lg font-semibold mb-4 pb-3 border-b border-[#eef0f5]"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                    >
                      {open.subject}
                    </p>
                  )}
                  <div
                    className="tpl-body text-[15px] leading-relaxed text-[#1a1b1f]"
                    dangerouslySetInnerHTML={{ __html: toHtml(open.body) }}
                  />
                </article>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-[#eef0f5] bg-[#fafbfd]">
              {open.imageUrl ? (
                <>
                  <a
                    href={open.imageUrl}
                    download={`${open.slug}.png`}
                    className="bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
                  >
                    Download image
                  </a>
                  <a
                    href={open.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-[#0088ff] hover:underline"
                  >
                    Open full size
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => copyFormatted(open)}
                    className="bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
                  >
                    {copied === 'formatted' ? 'Copied!' : 'Copy for email'}
                  </button>
                  <button
                    onClick={() => copyText(open)}
                    className="border border-[#dfe3ec] hover:border-[#0088ff] text-[#02176f] font-semibold rounded-full py-2.5 px-5 text-sm transition-colors"
                  >
                    {copied === 'text' ? 'Copied!' : 'Copy plain text'}
                  </button>
                  <button
                    onClick={() => print(open)}
                    className="text-sm font-semibold text-[#0088ff] hover:underline"
                  >
                    Print / save as PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .tpl-body p { margin: 0 0 1em; }
        .tpl-body h3 { font-weight: 700; color: #02176f; margin: 1.4em 0 .5em; font-size: 15px; }
        .tpl-body ul { margin: 0 0 1em; padding-left: 1.2em; list-style: disc; }
        .tpl-body li { margin: .3em 0; }
      `}</style>
    </section>
  );
}
