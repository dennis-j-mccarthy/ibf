'use client';

import { useCallback, useEffect, useState } from 'react';

// Tutorials library — saved recordings from /admin/tutorials/record. Reopen,
// play, copy the link, or delete. Videos live on Vercel Blob.
type Tutorial = { id: number; title: string; url: string; contentType: string; size: number; createdAt: string };

const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function TutorialsLibrary() {
  const [items, setItems] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/tutorials');
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: number) => {
    if (!confirm('Delete this tutorial? The record is removed (the video file stays in Blob storage).')) return;
    await fetch(`/api/admin/tutorials?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Tutorials</h1>
          <div className="flex items-center gap-2">
            <a href="/admin/tutorials/record" className="text-sm bg-white text-[#02176f] font-semibold px-3 py-1.5 rounded-md hover:bg-white/90 transition-colors">Record new</a>
            <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8">
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">No saved tutorials yet.</p>
            <a href="/admin/tutorials/record" className="inline-block bg-[#7c3aed] text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-[#7c3aed]/90 transition-colors">Record your first tutorial</a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <video src={t.url} controls preload="metadata" className="w-full bg-black max-h-[300px]" />
                <div className="p-4">
                  <h2 className="font-brother text-[#02176f] font-semibold truncate">{t.title}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(t.createdAt)} · {fmtSize(t.size)} · {t.contentType.replace('video/', '').toUpperCase()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href={t.url} target="_blank" rel="noopener" className="text-sm bg-[#02176f] text-white px-4 py-2 rounded-lg hover:bg-[#02176f]/90 transition-colors">Open</a>
                    <a href={t.url} download={`${t.title}.${t.contentType.includes('mp4') ? 'mp4' : 'webm'}`} className="text-sm border border-gray-300 text-[#02176f] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Download</a>
                    <button onClick={() => navigator.clipboard?.writeText(t.url)} className="text-sm border border-gray-300 text-[#02176f] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Copy link</button>
                    <button onClick={() => remove(t.id)} className="text-sm text-gray-400 hover:text-red-600 px-2 ml-auto">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
