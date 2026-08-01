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

// Social destinations for the (demo) one-click "Post" button. This is a
// simulated publish — nothing goes live until real Meta/etc. accounts are wired
// up. Each has a brand color for the toggle chip.
const SOCIALS = [
  { key: 'facebook', label: 'Facebook', hex: '#1877f2' },
  { key: 'instagram', label: 'Instagram', hex: '#e1306c' },
  { key: 'x', label: 'X', hex: '#000000' },
  { key: 'tiktok', label: 'TikTok', hex: '#010101' },
  { key: 'pinterest', label: 'Pinterest', hex: '#e60023' },
];

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

// A book-carousel post renders as N vertical slides: a hook slide, then one
// "book-slide" per featured book (items[k] is that book's selling line).
function carouselUrls(p: Post) {
  const hook = ogUrl({ ...p, theme: 'statement', format: 'reel', sub: p.sub || 'Swipe →' }, 'tiktok');
  const slides = (p.books || []).map((b, k) => {
    const q = new URLSearchParams({
      theme: 'book-slide', mode: p.mode, size: 'tiktok',
      statement: (p.items || [])[k] || '', sub: '', eyebrow: p.eyebrow || '', statLabel: '', items: '',
    });
    q.set('books', JSON.stringify([b]));
    if (p.bg) q.set('bg', p.bg);
    if (p.hColor) q.set('hColor', p.hColor);
    if (p.eColor) q.set('eColor', p.eColor);
    if (p.sColor) q.set('sColor', p.sColor);
    return `/api/og/post?${q.toString()}`;
  });
  return [hook, ...slides];
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

  // Demo "Post" flow (simulated — no real publishing yet).
  const [postOpen, setPostOpen] = useState<number | null>(null);
  const [postSel, setPostSel] = useState<Record<string, boolean>>({ facebook: true, instagram: true });
  const [postingIdx, setPostingIdx] = useState<number | null>(null);
  const [postedIdx, setPostedIdx] = useState<Record<number, string[]>>({});

  async function fakePost(i: number) {
    const chosen = SOCIALS.filter((s) => postSel[s.key]).map((s) => s.key);
    if (!chosen.length) return;
    setPostingIdx(i);
    // Simulated network round-trip so the button visibly "posts".
    await new Promise((r) => setTimeout(r, 1400));
    setPostingIdx(null);
    setPostedIdx((cur) => ({ ...cur, [i]: chosen }));
    setPostOpen(null);
  }

  // Saved posts, attached to this parent concept (blog title or campaign name).
  const concept = (title || strategy || '').trim();
  const [savedPosts, setSavedPosts] = useState<{ id: number; post: Post }[]>([]);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!concept) return;
    fetch(`/api/admin/social/saved?concept=${encodeURIComponent(concept)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setSavedPosts(rows.map((r: { id: number; post: Post }) => ({ id: r.id, post: r.post }))))
      .catch(() => {});
  }, [concept]);

  const savePost = async (p: Post, i: number) => {
    if (!concept || savedIdx.has(i)) return;
    setSavingIdx(i);
    try {
      const r = await fetch('/api/admin/social/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concept, post: p }),
      });
      if (r.ok) {
        const row = await r.json();
        setSavedIdx((cur) => new Set(cur).add(i));
        setSavedPosts((cur) => [{ id: row.id, post: p }, ...cur]);
      }
    } finally {
      setSavingIdx(null);
    }
  };

  const deleteSaved = async (id: number) => {
    setSavedPosts((cur) => cur.filter((s) => s.id !== id));
    await fetch(`/api/admin/social/saved?id=${id}`, { method: 'DELETE' });
  };

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
      if (books.length) result.forEach((p) => { if (p.theme === 'book-grid' || p.theme === 'book-carousel') p.books = cover; });
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
      // Guarantee a book carousel whenever there are 2+ books: if the model didn't
      // return one, convert a book-grid post into a carousel (or prepend one).
      if (books.length >= 2 && !result.some((p) => p.theme === 'book-carousel')) {
        const grid = result.find((p) => p.theme === 'book-grid');
        if (grid) {
          grid.theme = 'book-carousel';
          grid.format = 'reel';
          if (!grid.items || grid.items.length !== books.length) grid.items = books.map(() => '');
        } else {
          result.unshift({
            theme: 'book-carousel', format: 'reel', mode: 'catholic', eyebrow: 'Featured Books',
            statement: 'Good books for great kids.', sub: 'Swipe →', statLabel: '', items: books.map(() => ''),
            caption: 'Featured in this post:\n' + books.map((b) => `• ${b.title} — ${b.url}`).join('\n'),
            hashtags: ['IgnatiusBookFairs'],
            books: cover,
          });
        }
      }
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
                ) : p.theme === 'book-carousel' ? (
                  <>
                    <div className="w-full flex gap-3 overflow-x-auto pb-2">
                      {carouselUrls(p).map((u, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={u} alt={`${p.statement} — slide ${k + 1}`} onLoad={() => { if (k === 0) setLoaded((n) => { const nx = n + 1; if (nx >= posts.length) setPhase('done'); return nx; }); }} className="h-[380px] rounded-lg shadow shrink-0" />
                      ))}
                    </div>
                    <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wide bg-[#0088ff] text-white px-2 py-0.5 rounded-full">Carousel · {carouselUrls(p).length} slides</span>
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
                  {!p.video && p.theme === 'book-carousel' ? (
                    carouselUrls(p).map((u, k) => (
                      <a key={k} href={u} download={`ibf-carousel-${i + 1}-slide-${k + 1}.png`} className="text-sm bg-[#02176f] text-white px-3 py-2 rounded-lg hover:bg-[#02176f]/90 transition-colors">Slide {k + 1}</a>
                    ))
                  ) : !p.video && (
                    <a href={ogUrl(p, platform, i)} download={`ibf-${p.theme}-${i + 1}.png`} className="text-sm bg-[#02176f] text-white px-4 py-2 rounded-lg hover:bg-[#02176f]/90 transition-colors">Download image</a>
                  )}
                  {concept && (
                    <button
                      onClick={() => savePost(p, i)}
                      disabled={savingIdx === i || savedIdx.has(i)}
                      className={`text-sm px-4 py-2 rounded-lg transition-colors ${savedIdx.has(i) ? 'bg-[#00c853]/10 text-[#00a843]' : 'bg-[#00c853] text-white hover:bg-[#00a843]'} disabled:opacity-80`}
                    >
                      {savedIdx.has(i) ? 'Saved ✓' : savingIdx === i ? 'Saving…' : 'Save'}
                    </button>
                  )}
                  {p.format === 'reel' && p.theme !== 'book-carousel' && (
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
                  {postedIdx[i]?.length ? (
                    <span className="text-sm text-[#00a843] inline-flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      Posted to {postedIdx[i].map((k) => SOCIALS.find((s) => s.key === k)?.label).join(', ')}
                    </span>
                  ) : (
                    <button onClick={() => setPostOpen(postOpen === i ? null : i)} className={`text-sm px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 ${postOpen === i ? 'bg-[#0088ff] text-white' : 'bg-[#0088ff] text-white hover:bg-[#0088ff]/90'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      Post
                    </button>
                  )}
                  <button onClick={() => setTweakOpen(tweakOpen === i ? null : i)} className={`text-sm px-4 py-2 rounded-lg border transition-colors ml-auto ${tweakOpen === i ? 'bg-[#7c3aed] text-white border-[#7c3aed]' : 'border-[#7c3aed] text-[#7c3aed] hover:bg-[#7c3aed]/5'}`}>Tweak</button>
                </div>

                {postOpen === i && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-0.5">Post to accounts</p>
                    <p className="text-[11px] text-gray-400 mb-3">Demo — this simulates publishing. No accounts are connected yet, so nothing goes live.</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {SOCIALS.map((s) => {
                        const on = !!postSel[s.key];
                        return (
                          <button
                            key={s.key}
                            onClick={() => setPostSel((sel) => ({ ...sel, [s.key]: !sel[s.key] }))}
                            className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                            style={on ? { backgroundColor: s.hex, borderColor: s.hex, color: '#fff' } : { borderColor: '#d1d5db', color: '#4b5563' }}
                          >
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fakePost(i)}
                        disabled={postingIdx === i || !SOCIALS.some((s) => postSel[s.key])}
                        className="text-sm bg-[#0088ff] text-white px-4 py-2 rounded-lg hover:bg-[#0088ff]/90 disabled:opacity-60 transition-colors"
                      >
                        {postingIdx === i ? 'Posting…' : 'Post now'}
                      </button>
                      <button onClick={() => setPostOpen(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                    </div>
                  </div>
                )}

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

      {/* Saved posts for this concept */}
      {savedPosts.length > 0 && (
        <div className="mt-10">
          <h3 className="font-brother text-[#02176f] text-sm font-semibold mb-1">Saved posts{concept ? ` — ${concept}` : ''}</h3>
          <p className="text-xs text-gray-500 mb-3">These stay attached to this concept and will be here next time.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {savedPosts.map((s) => (
              <div key={s.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {s.post.theme === 'book-carousel' ? (
                  <div className="flex gap-1.5 overflow-x-auto p-2 bg-gray-50">
                    {carouselUrls(s.post).map((u, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={k} src={u} alt="" className="h-[140px] rounded shrink-0" />
                    ))}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ogUrl(s.post, platform)} alt={s.post.statement} className="w-full" />
                )}
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 truncate">{s.post.theme}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.post.theme !== 'book-carousel' && (
                      <a href={ogUrl(s.post, platform)} download={`ibf-saved-${s.id}.png`} className="text-[11px] text-[#0066ff] hover:underline">PNG</a>
                    )}
                    <button onClick={() => deleteSaved(s.id)} className="text-[11px] text-gray-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
