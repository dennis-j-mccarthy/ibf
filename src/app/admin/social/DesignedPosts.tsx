'use client';

import { useEffect, useState } from 'react';

// Reusable "generate + render on-brand designed graphics" panel. Used by the
// standalone /admin/social studio AND the blog Promo kit page. Given a title +
// content and/or a campaign strategy, it calls the social generator and renders
// each returned post through the design-system og renderer, with a progress bar
// that actually advances during the (slow) generation call.

type Post = {
  theme: string;
  mode: string;
  eyebrow: string;
  statement: string;
  sub: string;
  statLabel: string;
  items: string[];
  caption: string;
  hashtags: string[];
};

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram (1:1)' },
  { key: 'facebook', label: 'Facebook (4:5)' },
  { key: 'tiktok', label: 'TikTok (9:16)' },
  { key: 'pinterest', label: 'Pinterest (2:3)' },
  { key: 'x', label: 'X (16:9)' },
];

const MODE_HEX: Record<string, string> = { catholic: '#0088ff', parish: '#50db92', public: '#ff6445', virtual: '#42ade2' };

function ogUrl(p: Post, size: string) {
  const q = new URLSearchParams({
    theme: p.theme, mode: p.mode, size,
    statement: p.statement || '', sub: p.sub || '', eyebrow: p.eyebrow || '',
    statLabel: p.statLabel || '', items: (p.items || []).join('|'),
  });
  return `/api/og/post?${q.toString()}`;
}

export default function DesignedPosts({
  title = '', content = '', strategy = '', count = 5, defaultPlatform = 'instagram',
}: {
  title?: string; content?: string; strategy?: string; count?: number; defaultPlatform?: string;
}) {
  const [platform, setPlatform] = useState(defaultPlatform);
  const [phase, setPhase] = useState<'idle' | 'writing' | 'rendering' | 'done'>('idle');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ title, content, strategy, count }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Generation failed (${res.status})`);
      }
      const data = (await res.json()) as { posts: Post[] };
      if (!data.posts?.length) throw new Error('No posts returned.');
      setPosts(data.posts); setPhase('rendering');
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
              <div className="bg-gray-50 grid place-items-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ogUrl(p, platform)} alt={p.statement} onLoad={() => setLoaded((n) => { const nx = n + 1; if (nx >= posts.length) setPhase('done'); return nx; })} className="w-full max-w-[420px] rounded-lg shadow" />
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
                <div className="mt-4 flex gap-3">
                  <a href={ogUrl(p, platform)} download={`ibf-${p.theme}-${i + 1}.png`} className="text-sm bg-[#02176f] text-white px-4 py-2 rounded-lg hover:bg-[#02176f]/90 transition-colors">Download</a>
                  <button onClick={() => navigator.clipboard?.writeText(`${p.caption}\n\n${(p.hashtags || []).map((h) => `#${h.replace(/^#/, '')}`).join(' ')}`)} className="text-sm border border-gray-300 text-[#02176f] px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Copy caption</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
