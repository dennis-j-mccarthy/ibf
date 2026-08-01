'use client';

import { useEffect } from 'react';
import type { Resource } from '@prisma/client';

// Mirrors the high-end resource modals on /bookfair-resources (VideoModal +
// ResourceDetailModal) so checklist resource links open with the same look.
const categoryColors: Record<string, string> = {
  Operational: '#ff6445',
  Advertising: '#00c853',
  Tutorials: '#b9dbc5',
  Public: '#02176f',
};
const getCategoryColor = (category: string | null) => categoryColors[category || ''] || '#ff6445';

function processEmbedCode(embedCode: string) {
  let processed = embedCode
    .replace(/width="[^"]*"/gi, '')
    .replace(/height="[^"]*"/gi, '')
    .replace(/style="[^"]*"/gi, '')
    .replace(
      /<iframe/gi,
      '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"'
    );
  if (processed.includes('wistia-player')) {
    processed = processed.replace(
      /<wistia-player([^>]*)>/gi,
      '<wistia-player$1 style="position:absolute;top:0;left:0;width:100%;height:100%">'
    );
  }
  return processed;
}

export default function ResourceModal({
  resource,
  onClose,
}: {
  resource: Resource;
  onClose: () => void;
}) {
  const isVideo = resource.resourceType === 'Video' || !!resource.embedCode;

  useEffect(() => {
    if (resource.embedCode?.includes('wistia-player')) {
      if (!document.querySelector('script[src*="wistia"]')) {
        const script = document.createElement('script');
        script.src = 'https://fast.wistia.com/assets/external/E-v1.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [resource.embedCode]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (isVideo) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
            {resource.embedCode ? (
              <div
                className="absolute inset-0"
                dangerouslySetInnerHTML={{ __html: processEmbedCode(resource.embedCode) }}
              />
            ) : resource.fileUrl ? (
              // Published tutorial: a direct video file (no embed code) — play it natively.
              <video src={resource.fileUrl} controls playsInline className="absolute inset-0 w-full h-full bg-black" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900">
                <p className="text-gray-400">Video not available</p>
              </div>
            )}
          </div>
          <div className="p-6 bg-gradient-to-t from-black to-gray-900">
            <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {resource.title}
            </h3>
            {resource.description && (
              <p className="text-gray-300 text-sm leading-relaxed">{resource.description}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Document detail layout.
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8">
          <span
            className="text-[10px] uppercase tracking-wider font-semibold block mb-3"
            style={{ color: getCategoryColor(resource.category) }}
          >
            {resource.category || 'Resource'}
          </span>

          <div className="flex gap-8 items-start">
            <div className="flex-shrink-0 w-40">
              <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
                {resource.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resource.thumbnail} alt={resource.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2
                className="text-2xl font-bold text-[#02176f] mb-3 leading-tight"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                {resource.title}
              </h2>
              {resource.description && (
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">{resource.description}</p>
              )}
              {resource.fileUrl && (
                <div className="flex flex-wrap gap-3">
                  <a
                    href={resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-5 py-2.5 rounded-full transition-colors"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Open / Download
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
