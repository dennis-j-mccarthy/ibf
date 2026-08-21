'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import {
  detectCategoryIds,
  parseFlyer,
  parseProducts,
  productsInCategory,
  runChecks,
  type BcProduct,
  type Check,
  type Flyer,
  type Severity,
} from '@/lib/flyer/preflight';

// Checks a generated flyer IDML against the BigCommerce export that produced
// it, before anyone opens InDesign. Everything runs in this browser -- the
// files are large and never need to leave the machine.

const input =
  'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';

const TONE: Record<Severity, { dot: string; bg: string; border: string; word: string }> = {
  pass: { dot: '#00c853', bg: '#f2fbf6', border: '#cdefdc', word: 'Pass' },
  warn: { dot: '#ffd41d', bg: '#fffbeb', border: '#f3e3ab', word: 'Check' },
  fail: { dot: '#ff6445', bg: '#fff5f3', border: '#ffd6cd', word: 'Problem' },
};

function DropZone({
  label,
  hint,
  accept,
  fileName,
  onFile,
}: {
  label: string;
  hint: string;
  accept: string;
  fileName: string | null;
  onFile: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
      onClick={() => ref.current?.click()}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
        over ? 'border-[#0066ff] bg-[#f0f8ff]' : fileName ? 'border-[#cdefdc] bg-[#f2fbf6]' : 'border-[#dddddd] bg-white'
      }`}
    >
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <p className="text-sm font-semibold text-[#02176f]">{label}</p>
      <p className="mt-1 text-xs text-[#6b7280]">{fileName ?? hint}</p>
    </div>
  );
}

export default function FlyerPreflight() {
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [flyerName, setFlyerName] = useState<string | null>(null);
  const [products, setProducts] = useState<BcProduct[] | null>(null);
  const [csvName, setCsvName] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFlyer = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        const parsed = parseFlyer(new Uint8Array(await file.arrayBuffer()));
        setFlyer(parsed);
        setFlyerName(file.name);
        if (!parsed.sections.length) {
          setError(
            `No section groups found in ${file.name}. A flyer is only checkable once its frames are grouped into "<Category> Group" sections.`,
          );
        }
        if (products) setCategoryIds(detectCategoryIds(parsed, products));
      } catch {
        setError(`Could not read ${file.name}. Is it an IDML file?`);
      } finally {
        setBusy(false);
      }
    },
    [products],
  );

  const loadCsv = useCallback(
    (file: File) => {
      setError(null);
      setBusy(true);
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => {
          const parsed = parseProducts(res.data);
          setProducts(parsed);
          setCsvName(file.name);
          if (!parsed.length) setError(`No product rows in ${file.name}. Expected a BigCommerce product export.`);
          if (flyer) setCategoryIds(detectCategoryIds(flyer, parsed));
          setBusy(false);
        },
        error: () => {
          setError(`Could not read ${file.name}.`);
          setBusy(false);
        },
      });
    },
    [flyer],
  );

  const checks = useMemo(
    () => (flyer && products ? runChecks(flyer, products, categoryIds) : null),
    [flyer, products, categoryIds],
  );

  const verdict: Severity | null = checks
    ? checks.some((c) => c.severity === 'fail')
      ? 'fail'
      : checks.some((c) => c.severity === 'warn')
        ? 'warn'
        : 'pass'
    : null;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="bg-[#02176f] text-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <a href="/admin" className="text-sm text-white/70 hover:text-white">
            &larr; Admin
          </a>
          <h1 className="mt-2 text-2xl font-bold" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            Flyer Preflight
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Check a generated flyer against the BigCommerce export before it goes to print.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <DropZone
            label="Flyer IDML"
            hint="Drop the generated .idml, or click to choose"
            accept=".idml"
            fileName={flyerName}
            onFile={loadFlyer}
          />
          <DropZone
            label="BigCommerce export"
            hint="Drop the product export .csv, or click to choose"
            accept=".csv"
            fileName={csvName}
            onFile={loadCsv}
          />
        </div>

        {busy && <p className="mt-4 text-sm text-[#6b7280]">Reading…</p>}
        {error && (
          <div className="mt-4 rounded-lg border border-[#ffd6cd] bg-[#fff5f3] px-4 py-3 text-sm text-[#02176f]">
            {error}
          </div>
        )}

        {flyer && flyer.sections.length > 0 && (
          <section className="mt-6 rounded-xl border border-[#eef0f5] bg-white p-5">
            <h2 className="text-sm font-semibold text-[#02176f]">Sections and category IDs</h2>
            <p className="mt-1 mb-3 text-xs text-[#6b7280]">
              IDs are guessed from title overlap when an export is loaded. Correct any that are wrong — the checks below
              are only as good as this mapping.
            </p>
            <div className="space-y-2">
              {flyer.sections.map((s) => {
                const id = categoryIds[s.name] ?? '';
                const count = products ? productsInCategory(products, id).length : 0;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-[#02176f]">{s.name}</span>
                    <span className="text-xs text-[#6b7280]">{s.books.length} books</span>
                    <input
                      className={`${input} w-28`}
                      value={id}
                      inputMode="numeric"
                      placeholder="cat ID"
                      onChange={(e) => setCategoryIds({ ...categoryIds, [s.name]: e.target.value.trim() })}
                    />
                    <span className="w-24 text-right text-xs text-[#6b7280]">
                      {id ? `${count} in category` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {checks && verdict && (
          <section className="mt-6">
            <div
              className="rounded-xl border px-5 py-4"
              style={{ background: TONE[verdict].bg, borderColor: TONE[verdict].border }}
            >
              <p className="text-lg font-semibold text-[#02176f]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                {verdict === 'pass'
                  ? 'Ready to ship'
                  : verdict === 'warn'
                    ? 'Ready, with things to confirm'
                    : 'Not ready'}
              </p>
              <p className="mt-1 text-sm text-[#02176f]/70">
                {flyer!.sections.length} sections ·{' '}
                {flyer!.sections.reduce((n, s) => n + s.books.length, 0)} books · checked against {csvName}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {checks.map((c) => (
                <CheckRow key={c.id} check={c} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function CheckRow({ check }: { check: Check }) {
  const [open, setOpen] = useState(check.severity !== 'pass');
  const tone = TONE[check.severity];

  return (
    <div className="rounded-xl border border-[#eef0f5] bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        disabled={!check.details.length}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: tone.dot }} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-[#02176f]">{check.label}</span>
          <span className="block text-xs text-[#6b7280]">{check.summary}</span>
        </span>
        <span className="text-xs font-medium" style={{ color: tone.dot }}>
          {tone.word}
        </span>
        {check.details.length > 0 && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        )}
      </button>
      {open && check.details.length > 0 && (
        <ul className="border-t border-[#eef0f5] px-5 py-3">
          {check.details.map((d, i) => (
            <li key={i} className="py-0.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#4b5563]">
              {d}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
