'use client';

import { useEffect, useState } from 'react';
import { renderReelMp4, renderReelFromVideoMp4, reelSupported } from './reel';

// Reusable "generate + render on-brand designed graphics" panel. Used by the
// standalone /admin/social studio AND the blog Promo kit page. Given a title +
// content and/or a campaign strategy, it calls the social generator and renders
// each returned post through the design-system og renderer, with a progress bar
// that actually advances during the (slow) generation call.

type Book = { title: string; url: string; image: string };
type Post = {
  theme: string;
  format?: string; // 'square' | 'reel'
  mode: string;
  eyebrow: string;
  statement: string;
  sub: string;
  statLabel: string;
  items: string[];
  caption: string;
  hashtags: string[];
  books?: { title: string; image: string }[]; // for the book-grid card
  img?: string; // photo-hero background from the Training library (absolute URL)
  video?: string; // motion-clip background for a video reel (url/path)
  // Tweak-tool color overrides (hex); blank = theme default.
  bg?: string; // background color
  hColor?: string; // headline color
  eColor?: string; // eyebrow color
  sColor?: string; // sub / blurb color
};

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram (1:1)' },
  { key: 'facebook', label: 'Facebook (4:5)' },
  { key: 'tiktok', label: 'TikTok (9:16)' },
  { key: 'pinterest', label: 'Pinterest (2:3)' },
  { key: 'x', label: 'X (16:9)' },
];

const MODE_HEX: Record<string, string> = { catholic: '#0088ff', parish: '#50db92', public: '#ff6445', virtual: '#42ade2' };

// Lifestyle photo pool for photo-hero posts (public/brand/photos). photo-05 is
// the Loupio mascot, excluded from full-bleed backgrounds.
const PHOTOS = ['photo-01.jpg', 'photo-02.jpg', 'photo-03.jpg', 'photo-04.jpg', 'photo-06.jpg', 'photo-07.jpg', 'photo-08.jpg', 'photo-09.jpg', 'photo-10.jpg', 'photo-11.jpg', 'photo-12.jpg', 'photo-13.jpg', 'photo-14.jpg', 'photo-15.jpg'];

function ogUrl(p: Post, size: string, index = 0) {
  const eff = p.format === 'reel' ? 'tiktok' : size; // reels render 9:16 regardless of platform
  const q = new URLSearchParams({
    theme: p.theme, mode: p.mode, size: eff,
    statement: p.statement || '', sub: p.sub || '', eyebrow: p.eyebrow || '',
    statLabel: p.statLabel || '', items: (p.items || []).join('|'),
  });
  if (p.theme === 'photo-hero') q.set('img', p.img || PHOTOS[index % PHOTOS.length]);
  if (p.theme === 'book-grid' && p.books?.length) q.set('books', JSON.stringify(p.books));
  if (p.bg) q.set('bg', p.bg);
  if (p.hColor) q.set('hColor', p.hColor);
  if (p.eColor) q.set('eColor', p.eColor);
  if (p.sColor) q.set('sColor', p.sColor);
  return `/api/og/post?${q.toString()}`;
}

export default function DesignedPosts({
  title = '', content = '', strategy = '', count = 5, reels = 0, books = [], defaultPlatform = 'instagram',
}: {
  title?: string; content?: string; strategy?: string; count?: number; reels?: number; books?: Book[]; defaultPlatform?: string;
}) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [phase, setPhase] = useState<'idle' | 'writing' | 'rendering' | 'done'>('idle');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reelBusy, setReelBusy] = useState<number | null>(null);
  const [reelPct, setReelPct] = useState(0);
  const [tweakOpen, setTweakOpen] = useState<number | null>(null);
  const [library, setLibrary] = useState<{ url: string; alt: string; category: string }[]>([]);

  useEffect(() => {
    fetch('/api/admin/training/images').then((r) => (r.ok ? r.json() : [])).then(setLibrary).catch(() => {});
  }, []);

  const updatePost = (i: number, patch: Partial<Post>) =>
    setPosts((ps) => ps.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const MOTION_CLIPS = ['/brand/motion/kids-bookfair.mp4'];

  // Animate a reel post into a real H.264 MP4 in the browser and download it.
  async function downloadReel(p: Post, i: number) {
    setReelBusy(i);
    setReelPct(0);
    try {
      const onP = (frac: number) => setReelPct(Math.round(frac * 100));
      const blob = p.video
        ? await renderReelFromVideoMp4(
            { statement: p.statement, sub: p.sub, eyebrow: p.eyebrow, videoUrl: p.video, origin: window.location.origin },
            onP,
          )
        : await renderReelMp4(
            { statement: p.statement, sub: p.sub, eyebrow: p.eyebrow, img: p.img, bg: MODE_HEX[p.mode] || '#02176f', origin: window.location.origin },
            onP,
          );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ibf-reel-${i + 1}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not render the reel.');
    } finally {
      setReelBusy(null);
    }
  }

  // Progress that visibly advances: creep toward ~82% during the generation
  // call, then map the last stretch to image loads.
  useEffect(() => {
    if (phase === 'writing') {
      setPct(6);
      const id = setInterval(() => setPct((p) => (p < 82 ? p + Math.max(0.5, (82 - p) * 0.05) : p)), 400);
      return () => clearInterval(id);
    }
    if (phase === 'rendering') setPct(82 + Math.round((loaded / Math.max(posts.length, 1)) * 18));
    if (phase === 'done') setPct(100);
    if (phase === 'idle') setPct(0);
  }, [phase, loaded, posts.length]);

  async function generate() {
    setError(null);
    if (!content.trim() && !strategy.trim()) {
      setError('Add blog content or a campaign strategy first.');
      return;
    }
    setPosts([]); setLoaded(0); setPhase('writing');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, strategy, count, reels, books: books.map((b) => ({ title: b.title, url: b.url })) }),
      });
      // Non-stream error responses (401/503/400) still come back as JSON.
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Generation failed (${res.status})`);
      }
      // Read the NDJSON stream: progress heartbeats keep the connection alive.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let result: Post[] | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line) as { type: string; posts?: Post[]; error?: string };
          if (msg.type === 'error') throw new Error(msg.error || 'Generation failed');
          if (msg.type === 'done') result = msg.posts ?? [];
        }
      }
      if (!result?.length) throw new Error('No posts returned.');
      // Attach the real covers to every book-grid post the generator produced.
      const cover = books.map((b) => ({ title: b.title, image: b.image }));
      if (books.length) result.forEach((p) => { if (p.theme === 'book-grid') p.books = cover; });
      // Fallback: if books are featured but the model returned no book-grid post,
      // prepend one deterministic card so the covers still appear.
      const hasBookPost = result.some((p) => p.theme === 'book-grid');
      const bookCard: Post[] = books.length && !hasBookPost
        ? [{
            theme: 'book-grid', format: 'square', mode: 'catholic', eyebrow: 'Featured Books',
            statement: 'Good books for great kids.', sub: '', statLabel: '', items: [],
            caption: 'Featured in this post:\n' + books.map((b) => `• ${b.title} — ${b.url}`).join('\n'),
            hashtags: ['IgnatiusBookFairs'],
            books: cover,
          }]
        : [];
      setPosts([...bookCard, ...result]); setPhase('rendering');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('idle');
    }
  }

  const busy = phase === 'writing' || phase === 'rendering';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={generate} disabled={busy} className="bg-[#02176f] text-white font-medium px-6 py-2.5 rounded-lg hover:bg-[#02176f]/90 disabled:opacity-50 transition-colors">
          {busy ? 'Generating…' : 'Generate designed graphics'}
        </button>
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
          {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {(busy || phase === 'done') && (
          <div className="flex-1 min-w-[200px]">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0088ff] transition-all duration-300 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {phase === 'writing' && 'Writing copy — spinning into on-brand statements…'}
              {phase === 'rendering' && `Rendering post ${Math.min(loaded + 1, posts.length)} of ${posts.length}…`}
              {phase === 'done' && `Done — ${posts.length} posts.`}
            </p>
          </div>
        )}
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {posts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              <div className="bg-gray-50 grid place-items-center p-4 relative">
                {p.video ? (
                  <>
                    <video src={p.video} muted loop autoPlay playsInline onLoadedData={() => setLoaded((n) => { const nx = n + 1; if (nx >= posts.length) setPhase('done'); return nx; })} className="w-full max-w-[300px] rounded-lg shadow bg-black" />
                    <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide bg-[#7c3aed] text-white px-2 py-0.5 rounded-full">Motion reel</span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogUrl(p, platform, i)} alt={p.statement} onLoad={() => setLoaded((n) => { const nx = n + 1; if (nx >= posts.length) setPhase('done'); return nx; })} className="w-full max-w-[420px] rounded-lg shadow" />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{p.theme}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: MODE_HEX[p.mode] || '#0088ff' }}>{p.mode}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{p.caption}</p>
                {p.hashtags?.length > 0 && (
                  <p className="text-sm text-[#0088ff] mt-2">{p.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-3 items-center">
                  {!p.video && (
                    <a href={ogUrl(p, platform, i)} download={`ibf-${p.theme}-${i + 1}.png`} className="text-sm bg-[#02176f] text-white px-4 py-2 rounded-lg hover:bg-[#02176f]/90 transition-colors">Download image</a>
                  )}
                  {p.format === 'reel' && (
                    reelSupported() ? (
                      <button
                        onClick={() => downloadReel(p, i)}
                        disabled={reelBusy !== null}
                        className="text-sm bg-[#7c3aed] text-white px-4 py-2 rounded-lg hover:bg-[#7c3aed]/90 disabled:opacity-60 transition-colors"
                      >
                        {reelBusy === i ? `Rendering… ${reelPct}%` : 'Download reel (MP4)'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Reel MP4 needs Chrome/Edge</span>
                    )
                  )}
                  <button onClick={() => navigator.clipboard?.writeText(`${p.caption}\n\n${(p.hashtags || []).map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`)} className="text-sm border border-gray-300 text-[#02176f] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Copy caption</button>
                  <button onClick={() => setTweakOpen(tweakOpen === i ? null : i)} className={`text-sm px-4 py-2 rounded-lg border transition-colors ml-auto ${tweakOpen === i ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/5'}`}>Tweak</button>
                </div>

                {tweakOpen === i && (
                  <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                    {/* Text */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="text-xs text-gray-500">Headline
                        <input value={p.statement} onChange={(e) => updatePost(i, { statement: e.target.value })} className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </label>
                      <label className="text-xs text-gray-500">Eyebrow
                        <input value={p.eyebrow} onChange={(e) => updatePost(i, { eyebrow: e.target.value })} className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </label>
                      <label className="text-xs text-gray-500">Tagline / blurb
                        <input value={p.sub} onChange={(e) => updatePost(i, { sub: e.target.value })} className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </label>
                      <label className="text-xs text-gray-500">Caption
                        <textarea value={p.caption} onChange={(e) => updatePost(i, { caption: e.target.value })} rows={2} className="mt-1 w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      </label>
                    </div>

                    {/* Colors */}
                    <div className="flex flex-wrap gap-4">
                      {([['bg', 'Background'], ['hColor', 'Headline'], ['eColor', 'Eyebrow'], ['sColor', 'Blurb']] as const).map(([key, label]) => (
                        <label key={key} className="text-xs text-gray-500 flex items-center gap-1.5">
                          {label}
                          <input type="color" value={p[key] || '#02176f'} onChange={(e) => updatePost(i, { [key]: e.target.value })} className="w-7 h-7 rounded border border-gray-200 p-0" />
                          {p[key] && <button onClick={() => updatePost(i, { [key]: '' })} title="Reset" className="text-gray-400 hover:text-red-600">✕</button>}
                        </label>
                      ))}
                    </div>

                    {/* Background media (photo / motion clip) */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Background image / video {p.theme !== 'photo-hero' && p.format !== 'reel' && <span className="text-gray-400">(sets a photo background)</span>}</div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {MOTION_CLIPS.map((v) => (
                          <button key={v} onClick={() => updatePost(i, { video: v })} title="Motion clip" className={`shrink-0 w-14 h-14 rounded border-2 grid place-items-center text-[9px] font-semibold bg-[#7c3aed]/10 text-[#7c3aed] ${p.video === v ? 'border-[#7c3aed]' : 'border-transparent'}`}>VIDEO</button>
                        ))}
                        {library.map((im) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={im.url} src={im.url} alt={im.alt} onClick={() => updatePost(i, { img: im.url, video: '', theme: p.format === 'reel' ? p.theme : 'photo-hero' })} className={`shrink-0 w-14 h-14 object-cover rounded border-2 cursor-pointer ${p.img === im.url && !p.video ? 'border-[#7c3aed]' : 'border-transparent'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => updatePost(i, { bg: '', hColor: '', eColor: '', sColor: '', video: '' })} className="text-xs text-gray-500 hover:underline">Reset colors &amp; video</button>
                      <button onClick={() => setTweakOpen(null)} className="text-xs text-[#02176f] hover:underline ml-auto">Done</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
