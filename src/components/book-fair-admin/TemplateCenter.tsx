'use client';

import { useState } from 'react';
import HeaderIcon from './HeaderIcon';
import TemplateModal, { type CoordinatorTemplate } from './TemplateModal';
import { TEMPLATE_KINDS } from '@/lib/templates/defaults';

// Coordinator-facing template center. Everything here arrives already merged
// with this school's fair (server-side), so a coordinator copies or prints and
// is done — no blanks to fill in.

export type { CoordinatorTemplate };

export default function TemplateCenter({ templates }: { templates: CoordinatorTemplate[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (!templates.length) return null;

  const open = templates.find((t) => t.slug === openSlug) ?? null;

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

      {open && <TemplateModal template={open} onClose={() => setOpenSlug(null)} />}
    </section>
  );
}
