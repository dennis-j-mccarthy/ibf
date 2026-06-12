'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Renders a small "QR" action that pops a scannable code for a sign-up link —
// handy for flyers, bulletins, or projecting at back-to-school night.
export default function QrButton({ url, title }: { url: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open || src) return;
    QRCode.toDataURL(url, {
      width: 640,
      margin: 1,
      color: { dark: '#02176f', light: '#ffffff' },
    })
      .then(setSrc)
      .catch(() => {});
  }, [open, src, url]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Show a QR code for this link"
        aria-label="Show QR code"
        className="flex-shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#dfe3ec] text-[#02176f] hover:border-[#0088ff] hover:text-[#0088ff] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-xs bg-white rounded-2xl shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h4
              className="text-[#02176f] text-lg font-semibold mb-4"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              {title}
            </h4>
            <div className="aspect-square w-full bg-white rounded-lg flex items-center justify-center">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="QR code" className="w-full h-full object-contain" />
              ) : (
                <span className="text-sm text-[#7e828f]">Generating…</span>
              )}
            </div>
            {src && (
              <a
                href={src}
                download="book-fair-signup-qr.png"
                className="mt-4 inline-flex items-center gap-2 bg-[#0088ff] hover:bg-[#0070d8] text-white text-sm font-semibold rounded-full py-2 px-5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 4v12m0 0l-4-4m4 4l4-4" />
                </svg>
                Download
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
}
