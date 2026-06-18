'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Result = {
  type: 'resource' | 'faq' | 'page';
  title: string;
  snippet?: string;
  href: string;
  badge: string;
};

const badgeClass: Record<string, string> = {
  resource: 'bg-[#0088ff] text-white',
  faq: 'bg-[#FAC016] text-[#02176f]',
  page: 'bg-gray-200 text-gray-600',
};

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on outside click / Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    setResults([]);
    router.push(href, { scroll: false });
  };

  const term = q.trim();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Search"
        onClick={() => setOpen((o) => !o)}
        className="text-white hover:opacity-80 transition-opacity p-1.5"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-[min(92vw,420px)] bg-white rounded-xl shadow-2xl border border-black/5 overflow-hidden z-[60]">
          <div className="p-3 border-b border-gray-100">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search FAQs, resources, pages…"
              className="w-full px-3 py-2 text-sm text-[#1a1b1f] rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0088ff]"
            />
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {term.length < 2 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Type at least 2 characters…</p>
            ) : loading && results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No results for &ldquo;{term}&rdquo;.</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={`${r.type}-${i}`}
                  type="button"
                  onClick={() => go(r.href)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex gap-3 items-start"
                >
                  <span className={`shrink-0 mt-0.5 text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${badgeClass[r.type]}`}>
                    {r.badge}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#02176f] truncate">{r.title}</span>
                    {r.snippet && <span className="block text-xs text-gray-500 line-clamp-2 mt-0.5">{r.snippet}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
