'use client';

import { useEffect, useState } from 'react';

// Resolves the school's logo via the /api/school-logo route (Clearbit → site
// scrape). Renders a clean white chip only when a real logo is found; shows
// nothing otherwise (no favicon fallback).
export default function SchoolLogo({ domain, schoolName }: { domain: string; schoolName: string }) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/school-logo?domain=${encodeURIComponent(domain)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled && d.logo) setLogo(d.logo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (!logo) return null;

  return (
    <div className="flex-shrink-0 bg-white rounded-lg shadow-md p-2.5 h-16 min-w-[64px] flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={`${schoolName} logo`}
        className="max-h-11 max-w-[150px] w-auto object-contain"
        onError={() => setLogo(null)}
      />
    </div>
  );
}
