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

// The full editor state — saved as-is to SavedDesign.params and reloadable.
type DesignParams = {
  headline: string; sub: string; bg: string; eyebrow: string; qrUrl: string; footer: string;
  hColor: string; sColor: string; h2Color: string; showLogo: boolean;
  layout: 'center' | 'split'; img: string; imgMode: 'blob' | 'card' | 'png'; curve: 'arc' | 'wave' | 'wave2' | 'flat';
  picked: string[]; bookUrls: string; books: { title: string; image: string }[];
  recipient?: string; certDate?: string; sig1Name?: string; sig1Title?: string; sig2Name?: string; sig2Title?: string; showSeal?: boolean;
};
type DesignRow = { id: number; name: string; params: DesignParams };

function buildOgUrl(kind: 'header' | 'sign' | 'cert', p: DesignParams): string {
  if (kind === 'cert') {
    const q = new URLSearchParams({ title: p.headline, body: p.sub, bg: p.bg, logo: p.showLogo ? '1' : '0', seal: p.showSeal === false ? '0' : '1' });
    if (p.recipient) q.set('recipient', p.recipient);
    if (p.certDate) q.set('date', p.certDate);
    if (p.sig1Name) q.set('sig1Name', p.sig1Name);
    if (p.sig1Title) q.set('sig1Title', p.sig1Title);
    if (p.sig2Name) q.set('sig2Name', p.sig2Name);
    if (p.sig2Title) q.set('sig2Title', p.sig2Title);
    if (p.picked.length) q.set('doodads', JSON.stringify(p.picked));
    if (p.hColor) q.set('hColor', p.hColor);
    if (p.sColor) q.set('sColor', p.sColor);
    return `/api/og/cert?${q.toString()}`;
  }
  const isHeader = kind === 'header';
  const q = new URLSearchParams({ headline: p.headline, sub: p.sub, bg: p.bg, logo: p.showLogo ? '1' : '0' });
  if (p.picked.length) q.set('doodads', JSON.stringify(p.picked));
  if (p.hColor) q.set('hColor', p.hColor);
  if (p.sColor) q.set('sColor', p.sColor);
  if (isHeader && p.layout === 'split') {
    q.set('layout', 'split');
    if (p.img) {
      q.set('img', p.img);
      q.set('imgMode', p.imgMode);
    }
  }
  if (p.books.length) q.set('books', JSON.stringify(p.books));
  if (p.eyebrow.trim()) q.set('eyebrow', p.eyebrow.trim());
  if (p.h2Color) q.set('h2Color', p.h2Color);
  if (!isHeader) {
    if (p.qrUrl.trim()) q.set('qr', p.qrUrl.trim());
    if (p.footer.trim()) q.set('footer', p.footer.trim());
    if (p.img) {
      q.set('img', p.img);
      q.set('imgMode', p.imgMode);
    }
  }
  if (p.curve !== 'arc') q.set('curve', p.curve);
  return `/api/og/${isHeader ? 'header' : 'sign'}?${q.toString()}`;
}

export default function MakerTool({ kind }: { kind: 'header' | 'sign' | 'cert' }) {
  const isHeader = kind === 'header';
  const isCert = kind === 'cert';
  const [headline, setHeadline] = useState(isHeader ? 'The Book Fair Is Coming!' : isCert ? 'Certificate of Participation' : 'Book Fair This Week!');
  const [sub, setSub] = useState('');
  const [bg, setBg] = useState('#02176f');
  const [colors, setColors] = useState<Color[]>([]);
  const [doodadPool, setDoodadPool] = useState<Img[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [showLogo, setShowLogo] = useState(true);
  const [layout, setLayout] = useState<'center' | 'split'>('center');
  const [img, setImg] = useState('');
  const [imgMode, setImgMode] = useState<'blob' | 'card' | 'png'>('blob');
  const [curve, setCurve] = useState<'arc' | 'wave' | 'wave2' | 'flat'>('arc');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  // Sign-only: script eyebrow, QR code, footer note
  const [eyebrow, setEyebrow] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [footer, setFooter] = useState('');
  const [h2Color, setH2Color] = useState('');
  // Cert-only fields
  const [recipient, setRecipient] = useState('');
  const [certDate, setCertDate] = useState('');
  const [sig1Name, setSig1Name] = useState('');
  const [sig1Title, setSig1Title] = useState('');
  const [sig2Name, setSig2Name] = useState('');
  const [sig2Title, setSig2Title] = useState('');
  const [showSeal, setShowSeal] = useState(true);
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

  // Bumped by the Refresh button: re-pulls Training colors/doodads and
  // cache-busts the preview render.
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    fetch('/api/admin/training/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (p?.colors?.length) setColors(p.colors); })
      .catch(() => {});
    fetch('/api/admin/training/images')
      .then((r) => (r.ok ? r.json() : []))
      .then((imgs: Img[]) => setDoodadPool(imgs.filter((i) => i.category === 'doodads')))
      .catch(() => {});
  }, [refreshNonce]);

  const maxDoodads = isHeader ? 6 : isCert ? 10 : 8;

  const toggleDoodad = (url: string) =>
    setPicked((cur) => (cur.includes(url) ? cur.filter((u) => u !== url) : cur.length >= maxDoodads ? cur : [...cur, url]));

  // One click fills every scatter slot from the library (repeating if needed).
  const scatterDoodads = () => {
    if (!doodadPool.length) return;
    setPicked(Array.from({ length: maxDoodads }, (_, i) => doodadPool[i % doodadPool.length].url));
  };

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
      // PNGs default to the transparent-cutout treatment; photos to the blob.
      setImgMode(file.type === 'image/png' ? 'png' : 'blob');
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const currentParams: DesignParams = useMemo(
    () => ({ headline, sub, bg, eyebrow, qrUrl, footer, hColor, sColor, h2Color, showLogo, layout, img, imgMode, curve, picked, bookUrls, books, recipient, certDate, sig1Name, sig1Title, sig2Name, sig2Title, showSeal }),
    [headline, sub, bg, eyebrow, qrUrl, footer, hColor, sColor, h2Color, showLogo, layout, img, imgMode, curve, picked, bookUrls, books, recipient, certDate, sig1Name, sig1Title, sig2Name, sig2Title, showSeal],
  );

  const previewUrl = useMemo(() => {
    const url = buildOgUrl(kind, currentParams);
    return refreshNonce ? `${url}&v=${refreshNonce}` : url;
  }, [kind, currentParams, refreshNonce]);

  // Saved designs — the grid below the tool. Load fills the editor; Save while
  // loaded can update in place or save as a new copy.
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [designBusy, setDesignBusy] = useState(false);

  const loadDesigns = async () => {
    const r = await fetch(`/api/admin/designs?tool=${kind}`).catch(() => null);
    if (r?.ok) setDesigns(await r.json());
  };
  useEffect(() => { loadDesigns(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [kind, refreshNonce]);

  const applyParams = (p: DesignParams) => {
    setHeadline(p.headline ?? ''); setSub(p.sub ?? ''); setBg(p.bg ?? '#02176f');
    setEyebrow(p.eyebrow ?? ''); setQrUrl(p.qrUrl ?? ''); setFooter(p.footer ?? '');
    setHColor(p.hColor ?? ''); setSColor(p.sColor ?? ''); setH2Color(p.h2Color ?? '');
    setShowLogo(p.showLogo ?? true); setLayout(p.layout ?? 'center'); setImg(p.img ?? '');
    setImgMode(p.imgMode ?? 'blob'); setCurve(p.curve ?? 'arc'); setPicked(p.picked ?? []);
    setBookUrls(p.bookUrls ?? ''); setBooks(p.books ?? []);
    setRecipient(p.recipient ?? ''); setCertDate(p.certDate ?? '');
    setSig1Name(p.sig1Name ?? ''); setSig1Title(p.sig1Title ?? '');
    setSig2Name(p.sig2Name ?? ''); setSig2Title(p.sig2Title ?? ''); setShowSeal(p.showSeal !== false);
  };

  const saveDesign = async (mode: 'new' | 'update') => {
    setDesignBusy(true);
    try {
      if (mode === 'update' && loadedId) {
        await fetch('/api/admin/designs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loadedId, params: currentParams }),
        });
      } else {
        const r = await fetch('/api/admin/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: kind, name: headline.slice(0, 60), params: currentParams }),
        });
        if (r.ok) setLoadedId((await r.json()).id);
      }
      loadDesigns();
    } finally {
      setDesignBusy(false);
    }
  };

  const duplicateDesign = async (d: DesignRow) => {
    await fetch('/api/admin/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: kind, name: `${d.name || 'Untitled'} copy`, params: d.params }),
    });
    loadDesigns();
  };

  const renameDesign = async (id: number, name: string) => {
    setDesigns((cur) => cur.map((d) => (d.id === id ? { ...d, name } : d)));
    await fetch('/api/admin/designs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name }),
    });
  };

  const removeDesign = async (id: number) => {
    if (!confirm('Delete this saved design?')) return;
    if (loadedId === id) setLoadedId(null);
    setDesigns((cur) => cur.filter((d) => d.id !== id));
    await fetch(`/api/admin/designs?id=${id}`, { method: 'DELETE' });
  };

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
      const page = isCert ? doc.addPage([792, 612]) : doc.addPage([612, 792]);
      page.drawImage(embedded, { x: 0, y: 0, width: isCert ? 792 : 612, height: isCert ? 612 : 792 });
      const bytes = await doc.save();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = isCert ? 'ibf-certificate.pdf' : 'ibf-sign.pdf';
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
          <h1 className="font-brother text-lg sm:text-xl font-semibold">{isHeader ? 'Header Maker' : isCert ? 'Certificate Maker' : 'Sign Maker'}</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        <p className="text-sm text-gray-600 -mt-2">
          {isHeader
            ? 'Craft an email header with a curved bottom edge. '
            : isCert
              ? 'Craft a printable 11x8.5 certificate with a doodad border. '
              : 'Craft a printable 8.5×11 sign with the brand curve. '}
          Colors and doodads come from <a href="/admin/training" className="text-[#0066ff] hover:underline">Training</a>; the type is the brand Fredoka.
        </p>

        <section className="bg-white rounded-xl shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>{isCert ? 'Certificate title' : 'Headline'}</label>
              <input className={input} value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div>
              <label className={label}>{isCert ? 'Body line' : 'Subhead (optional)'}</label>
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
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt="" className="w-10 h-10 object-cover rounded" />
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                          <button onClick={() => setImgMode('blob')} className={`text-xs px-3 py-1.5 ${imgMode === 'blob' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Blob</button>
                          <button onClick={() => setImgMode('card')} className={`text-xs px-3 py-1.5 ${imgMode === 'card' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Photo card</button>
                          <button onClick={() => setImgMode('png')} className={`text-xs px-3 py-1.5 ${imgMode === 'png' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Transparent PNG</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              {uploadMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">{uploadMsg}</p>}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className={label}>
                Doodads (up to {maxDoodads})
                {picked.length > 0 && <span className="ml-2 text-[#7c3aed] font-semibold">{picked.length} applied</span>}
              </label>
              {doodadPool.length > 0 && (
                <div className="flex items-center gap-3">
                  <button onClick={scatterDoodads} className="text-xs bg-[#7c3aed] hover:bg-[#6b2fd6] text-white font-semibold px-3 py-1.5 rounded-md mb-1">✨ Scatter doodads</button>
                  {picked.length > 0 && <button onClick={() => setPicked([])} className="text-xs text-gray-500 hover:underline mb-1">Clear</button>}
                </div>
              )}
            </div>
            {doodadPool.length === 0 ? (
              <p className="text-sm text-gray-400">No doodads in the Training image library yet — add images with category “Doodads” and they’ll show up here.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {doodadPool.map((d) => {
                  const times = picked.filter((u) => u === d.url).length;
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDoodad(d.url)}
                      title={d.alt}
                      className={`relative w-16 h-16 rounded-lg border-[3px] p-1 transition-all bg-[#02176f] ${times ? 'border-[#00c853] ring-2 ring-[#00c853]/30' : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-300'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.url} alt={d.alt} className="w-full h-full object-contain" />
                      {times > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#00c853] text-white text-[10px] font-bold grid place-items-center shadow">
                          {times > 1 ? times : '✓'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!isCert && (
          <div className={`grid grid-cols-1 gap-4 ${isHeader ? 'sm:grid-cols-1' : 'sm:grid-cols-3'}`}>
            <div>
              <label className={label}>Script eyebrow (optional)</label>
              <input className={input} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Looking for more" />
            </div>
            {!isHeader && (
              <div>
                <label className={label}>QR code URL (optional)</label>
                <input className={input} value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="https://store.ignatiusbookfairs.com/…" />
              </div>
            )}
            {!isHeader && (
              <div>
                <label className={label}>Footer note (optional)</label>
                <input className={input} value={footer} onChange={(e) => setFooter(e.target.value)} placeholder="Check out our FULL selection at Ignatiusbookfairs.com" />
              </div>
            )}
          </div>
          )}

          {!isHeader && !isCert && (
            <div>
              <label className={label}>Image (optional — uploads to Blob)</label>
              <div className="flex flex-wrap items-center gap-3">
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
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-10 h-10 object-cover rounded" />
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      <button onClick={() => setImgMode('blob')} className={`text-xs px-3 py-1.5 ${imgMode === 'blob' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Blob</button>
                      <button onClick={() => setImgMode('card')} className={`text-xs px-3 py-1.5 ${imgMode === 'card' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Photo card</button>
                      <button onClick={() => setImgMode('png')} className={`text-xs px-3 py-1.5 ${imgMode === 'png' ? 'bg-[#02176f] text-white' : 'bg-white text-gray-600'}`}>Transparent PNG</button>
                    </div>
                    <button onClick={() => setImg('')} className="text-xs text-gray-500 hover:underline">Remove</button>
                  </>
                )}
              </div>
              {uploadMsg && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">{uploadMsg}</p>}
            </div>
          )}

          {!isCert && (
            <div>
              <label className={label}>Book covers (optional — up to {isHeader ? '5' : '6'} BigCommerce URLs, one per line{isHeader ? '; centered layout only' : ''})</label>
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

          {!isCert && (
          <div>
            <label className={label}>Bottom edge</label>
            <div className="flex flex-wrap gap-2">
              {([['arc', 'Arc'], ['wave', 'Wave'], ['wave2', 'Wave flipped'], ['flat', 'Flat']] as ['arc' | 'wave' | 'wave2' | 'flat', string][]).map(([key, lbl]) => (
                <button
                  key={key}
                  onClick={() => setCurve(key)}
                  className={`text-sm px-4 py-2 rounded-lg border ${curve === key ? 'bg-[#02176f] text-white border-[#02176f]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          )}

          {isCert && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Presented to (leave blank for a write-in line)</label>
                  <input className={input} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Loupio Magnificat" />
                </div>
                <div>
                  <label className={label}>Date (optional)</label>
                  <input className={input} value={certDate} onChange={(e) => setCertDate(e.target.value)} placeholder="November 15, 2026" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className={label}>Signature 1 name</label>
                  <input className={input} value={sig1Name} onChange={(e) => setSig1Name(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className={label}>Signature 1 title</label>
                  <input className={input} value={sig1Title} onChange={(e) => setSig1Title(e.target.value)} placeholder="Superintendent of Schools" />
                </div>
                <div>
                  <label className={label}>Signature 2 name</label>
                  <input className={input} value={sig2Name} onChange={(e) => setSig2Name(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <label className={label}>Signature 2 title</label>
                  <input className={input} value={sig2Title} onChange={(e) => setSig2Title(e.target.value)} placeholder="Book Battle Coordinator" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={showSeal} onChange={(e) => setShowSeal(e.target.checked)} />
                Gold star seal
              </label>
            </div>
          )}

          <div>
            <button onClick={() => setTweakOpen((v) => !v)} className="text-sm text-[#7c3aed] hover:underline">
              {tweakOpen ? 'Hide tweak' : 'Tweak'}
            </button>
            {tweakOpen && (
              <div className="space-y-3 mt-3 border border-gray-200 rounded-lg p-4">
                {([['Headline color', hColor, setHColor], ['Subhead color', sColor, setSColor], ['Last-word accent', h2Color, setH2Color]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
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
                <button onClick={() => { setHColor(''); setSColor(''); setH2Color(''); }} className="text-xs text-gray-500 hover:underline">Reset</button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold">Preview</h2>
            <div className="flex gap-3">
              <button onClick={() => setRefreshNonce(Date.now())} title="Re-pull Training colors & doodads and re-render" className="text-sm border border-gray-300 text-[#02176f] px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">↻ Refresh</button>
              {loadedId && (
                <button onClick={() => saveDesign('update')} disabled={designBusy} className="text-sm bg-[#7c3aed] hover:bg-[#6b2fd6] text-white font-semibold px-4 py-2 rounded-md disabled:opacity-60">Update saved</button>
              )}
              <button onClick={() => saveDesign('new')} disabled={designBusy} className="text-sm bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-4 py-2 rounded-md disabled:opacity-60">
                {designBusy ? 'Saving…' : loadedId ? 'Save as new' : 'Save design'}
              </button>
              <a href={previewUrl} download={isHeader ? 'ibf-email-header.png' : isCert ? 'ibf-certificate.png' : 'ibf-sign.png'} className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold text-sm px-5 py-2 rounded-md transition-colors">Download PNG</a>
              {!isHeader && (
                <button onClick={downloadPdf} disabled={pdfBusy} className="bg-[#00c853] hover:bg-[#00a843] text-white font-semibold text-sm px-5 py-2 rounded-md transition-colors disabled:opacity-60">
                  {pdfBusy ? 'Building PDF…' : 'Download PDF (8.5×11)'}
                </button>
              )}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview" className={`rounded-lg border border-gray-100 shadow-sm ${isHeader || isCert ? 'w-full' : 'max-w-[480px] mx-auto block'}`} />
          <p className="text-xs text-gray-400 mt-2">
            {isHeader
              ? '1200×450 — drop into your email at 600px wide; the curved edge blends into a white email body.'
              : isCert ? '1650x1275 (150 dpi letter, landscape) - the PDF is print-ready 11x8.5.' : '1275×1650 (150 dpi letter) — the PDF is print-ready 8.5×11.'}
          </p>
        </section>

        {/* Saved designs */}
        {designs.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold mb-1">Saved {isHeader ? 'headers' : isCert ? 'certificates' : 'signs'}</h2>
            <p className="text-sm text-gray-500 mb-4">Load one to change it (then Update saved or Save as new), or Duplicate for a quick copy.</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isHeader || isCert ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-4`}>
              {designs.map((d) => (
                <div key={d.id} className={`border rounded-xl overflow-hidden ${loadedId === d.id ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/25' : 'border-gray-100'}`}>
                  <div className="bg-gray-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={buildOgUrl(kind, d.params)} alt={d.name} className="w-full rounded shadow-sm" />
                  </div>
                  <div className="p-2.5 space-y-2">
                    <input
                      value={d.name}
                      placeholder="Untitled"
                      onChange={(e) => setDesigns((cur) => cur.map((x) => (x.id === d.id ? { ...x, name: e.target.value } : x)))}
                      onBlur={(e) => renameDesign(d.id, e.target.value)}
                      className="w-full text-sm font-medium text-[#02176f] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-[#0066ff] rounded px-1 -mx-1"
                    />
                    <div className="flex items-center gap-3 text-xs">
                      <button onClick={() => { applyParams(d.params); setLoadedId(d.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[#0066ff] hover:underline font-semibold">Load</button>
                      <button onClick={() => duplicateDesign(d)} className="text-[#7c3aed] hover:underline">Duplicate</button>
                      <a href={buildOgUrl(kind, d.params)} download={`ibf-${kind}-${d.id}.png`} className="text-gray-500 hover:underline">PNG</a>
                      <button onClick={() => removeDesign(d.id)} className="text-gray-400 hover:text-red-600 ml-auto">Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
