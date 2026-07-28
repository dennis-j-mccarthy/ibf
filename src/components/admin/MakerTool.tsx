'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// Shared brand "maker" tool used by Header Maker (email headers, 1200x450 PNG)
// and Sign Maker (8.5x11 printable, PNG + PDF). Headline, optional subhead,
// brand color, doodads + colors from the Training page, Fredoka type, and a
// Tweak panel for color overrides. Header adds a layout choice: centered, or
// headline left + uploaded image right.

type Color = { name: string; hex: string };
type Img = { id: number; url: string; alt: string; category: string };

const input = 'w-full px-3 py-2 border border-[#dddddd] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0066ff] text-sm';
const label = 'block text-sm font-medium text-[#02176f] mb-1';

export default function MakerTool({ kind }: { kind: 'header' | 'sign' }) {
  const isHeader = kind === 'header';
  const [headline, setHeadline] = useState(isHeader ? 'The Book Fair Is Coming!' : 'Book Fair This Week!');
  const [sub, setSub] = useState('');
  const [bg, setBg] = useState('#02176f');
  const [colors, setColors] = useState<Color[]>([]);
  const [doodadPool, setDoodadPool] = useState<Img[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [layout, setLayout] = useState<'center' | 'split'>('center');
  const [img, setImg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Sign-only: optional BigCommerce book covers
  const [bookUrls, setBookUrls] = useState('');
  const [books, setBooks] = useState<{ title: string; image: string }[]>([]);
  const [booksBusy, setBooksBusy] = useState(false);
  const [booksMsg, setBooksMsg] = useState('');
  // Tweak overrides
  const [tweakOpen, setTweakOpen] = useState(false);
  const [hColor, setHColor] = useState('');
  const [sColor, setSColor] = useState('');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/training/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (p?.colors?.length) setColors(p.colors); })
      .catch(() => {});
    fetch('/api/admin/training/images')
      .then((r) => (r.ok ? r.json() : []))
      .then((imgs: Img[]) => setDoodadPool(imgs.filter((i) => i.category === 'doodads')))
      .catch(() => {});
  }, []);

  const toggleDoodad = (url: string) =>
    setPicked((cur) => (cur.includes(url) ? cur.filter((u) => u !== url) : cur.length >= 3 ? cur : [...cur, url]));

  const onPickImage = async (file: File) => {
    setUploadMsg('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      const up = await fetch('/api/admin/training/upload', { method: 'POST', body: form });
      const j = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(j.error || `Upload failed (${up.status})`);
      setImg(j.url);
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const previewUrl = useMemo(() => {
    const q = new URLSearchParams({ headline, sub, bg, logo: showLogo ? '1' : '0' });
    if (picked.length) q.set('doodads', JSON.stringify(picked));
    if (hColor) q.set('hColor', hColor);
    if (sColor) q.set('sColor', sColor);
    if (isHeader && layout === 'split') {
      q.set('layout', 'split');
      if (img) q.set('img', img);
    }
    if (!isHeader && books.length) q.set('books', JSON.stringify(books));
    return `/api/og/${isHeader ? 'header' : 'sign'}?${q.toString()}`;
  }, [headline, sub, bg, picked, showLogo, hColor, sColor, layout, img, isHeader, books]);

  const fetchCovers = async () => {
    const urls = bookUrls.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6);
    if (!urls.length) { setBooks([]); return; }
    setBooksBusy(true);
    setBooksMsg('');
    try {
      const r = await fetch('/api/admin/books/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Fetch failed');
      const found = (d.books ?? []).map((b: { title: string; image: string }) => ({ title: b.title, image: b.image }));
      setBooks(found);
      setBooksMsg(found.length ? `${found.length} cover${found.length > 1 ? 's' : ''} loaded.` : 'No covers found at those URLs.');
    } catch (e) {
      setBooksMsg(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setBooksBusy(false);
    }
  };

  // Wrap the rendered PNG in a letter-size PDF (612x792pt) for printing.
  const downloadPdf = async () => {
    setPdfBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const png = await fetch(previewUrl).then((r) => r.arrayBuffer());
      const doc = await PDFDocument.create();
      const embedded = await doc.embedPng(png);
      const page = doc.addPage([612, 792]);
      page.drawImage(embedded, { x: 0, y: 0, width: 612, height: 792 });
      const bytes = await doc.save();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ibf-sign.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'PDF failed');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">{isHeader ? 'Header Maker' : 'Sign Maker'}</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <p className="text-sm text-gray-600 -mt-2">
          {isHeader
            ? 'Craft an email header with a curved bottom edge. '
            : 'Craft a printable 8.5×11 sign with the brand curve. '}
          Colors and doodads come from <a href="/admin/training" className="text-[#0066ff] hover:underline">Training</a>; the type is the brand Fredoka.
        </p>

        <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>Headline</label>
              <input className={input} value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div>
              <label className={label}>Subhead (optional)</label>
              <input className={input} value={sub} onChange={(e) => setSub(e.target.value)} placeholder="October 6–10 · St. Mary's Gymnasium" />
            </div>
          </div>

          <div>
            <label className={label}>Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {(colors.length ? colors : [{ name: 'IBF Dk Blue', hex: '#02176f' }, { name: 'Bright Blue', hex: '#0088ff' }]).map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setBg(c.hex)}
                  title={c.name}
                  className={`w-9 h-9 rounded-full border-2 transition-transform ${bg.toLowerCase() === c.hex.toLowerCase() ? 'border-[#02176f] scale-110' : 'border-white shadow'}`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-9 h-9 rounded border border-gray-200" title="Custom color" />
              <label className="flex items-center gap-2 ml-4 text-sm text-gray-600">
                <input type="checkbox" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} />
                IBF logo
              </label>
            </div>
          </div>

          {isHeader && (
            <div>
              <label className={label}>Layout</label>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setLayout('center')} className={`text-sm px-4 py-2 rounded-lg border ${layout === 'center' ? 'bg-[#02176f] text-white border-[#02176f]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Centered</button>
                <button onClick={() => setLayout('split')} className={`text-sm px-4 py-2 rounded-lg border ${layout === 'split' ? 'bg-[#02176f] text-white border-[#02176f]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>Headline left / image right</button>
                {layout === 'split' && (
                  <div className="flex items-center gap-3 ml-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); }}
                      className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-[#7c3aed] file:text-white file:font-semibold file:cursor-pointer disabled:opacity-50"
                    />
                    {uploading && <span className="text-xs text-gray-500">Uploading…</span>}
                    {img && !uploading && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-10 h-10 object-cover rounded" />
                    )}
                  </div>
                )}
              </div>
              {uploadMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">{uploadMsg}</p>}
            </div>
          )}

          <div>
            <label className={label}>Doodads (up to 3)</label>
            {doodadPool.length === 0 ? (
              <p className="text-sm text-gray-400">No doodads in the Training image library yet — add images with category “Doodads” and they’ll show up here.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {doodadPool.map((d) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={d.id}
                    src={d.url}
                    alt={d.alt}
                    onClick={() => toggleDoodad(d.url)}
                    className={`w-16 h-16 object-contain rounded-lg border-2 cursor-pointer bg-gray-50 p-1 transition-all ${picked.includes(d.url) ? 'border-[#7c3aed] scale-105' : 'border-transparent hover:border-gray-300'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {!isHeader && (
            <div>
              <label className={label}>Book covers (optional — up to 6 BigCommerce URLs, one per line)</label>
              <textarea
                className={input}
                rows={3}
                value={bookUrls}
                onChange={(e) => setBookUrls(e.target.value)}
                placeholder={'https://shop.ignatiusbookfairs.com/saint-george-and-the-dragon/\nhttps://shop.ignatiusbookfairs.com/library-lion/'}
              />
              <div className="flex items-center gap-3 mt-2">
                <button onClick={fetchCovers} disabled={booksBusy} className="bg-[#7c3aed] hover:bg-[#6b2fd6] text-white font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60">
                  {booksBusy ? 'Fetching…' : 'Fetch covers'}
                </button>
                {books.length > 0 && (
                  <button onClick={() => { setBooks([]); setBooksMsg(''); }} className="text-xs text-gray-500 hover:underline">Clear</button>
                )}
                {booksMsg && <span className="text-xs text-gray-500">{booksMsg}</span>}
              </div>
              {books.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {books.map((b, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={b.image} alt={b.title} title={b.title} className="w-10 h-14 object-cover rounded shadow" />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <button onClick={() => setTweakOpen((v) => !v)} className="text-sm text-[#7c3aed] hover:underline">
              {tweakOpen ? 'Hide tweak' : 'Tweak'}
            </button>
            {tweakOpen && (
              <div className="space-y-3 mt-3 border border-gray-200 rounded-lg p-4">
                {([['Headline color', hColor, setHColor], ['Subhead color', sColor, setSColor]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                  <div key={lbl} className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600 w-28">{lbl}</span>
                    {[{ name: 'White', hex: '#ffffff' }, ...colors].map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => set(c.hex)}
                        title={c.name}
                        className={`w-7 h-7 rounded-full border-2 transition-transform ${val.toLowerCase() === c.hex.toLowerCase() ? 'border-[#02176f] scale-110' : 'border-gray-200'}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                ))}
                <button onClick={() => { setHColor(''); setSColor(''); }} className="text-xs text-gray-500 hover:underline">Reset</button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold">Preview</h2>
            <div className="flex gap-3">
              <a href={previewUrl} download={isHeader ? 'ibf-email-header.png' : 'ibf-sign.png'} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-5 py-2 rounded-md transition-colors">Download PNG</a>
              {!isHeader && (
                <button onClick={downloadPdf} disabled={pdfBusy} className="bg-[#00c853] hover:bg-[#00a843] text-white font-semibold text-sm px-5 py-2 rounded-md transition-colors disabled:opacity-60">
                  {pdfBusy ? 'Building PDF…' : 'Download PDF (8.5×11)'}
                </button>
              )}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className={`rounded-lg border border-gray-100 shadow-sm ${isHeader ? 'w-full' : 'max-w-[480px] mx-auto block'}`} />
          <p className="text-xs text-gray-400 mt-2">
            {isHeader
              ? '1200×450 — drop into your email at 600px wide; the curved edge blends into a white email body.'
              : '1275×1650 (150 dpi letter) — the PDF is print-ready 8.5×11.'}
          </p>
        </section>
      </main>
    </div>
  );
}
