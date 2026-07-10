'use client';

import { useMemo, useState } from 'react';

type Blog = { id: number; title: string; content: string; summary: string | null; published: boolean };

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

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function ogUrl(p: Post, size: string) {
  const q = new URLSearchParams({
    theme: p.theme,
    mode: p.mode,
    size,
    statement: p.statement || '',
    sub: p.sub || '',
    eyebrow: p.eyebrow || '',
    statLabel: p.statLabel || '',
    items: (p.items || []).join('|'),
  });
  return `/api/og/post?${q.toString()}`;
}

export default function SocialStudio({ blogs }: { blogs: Blog[] }) {
  const [blogId, setBlogId] = useState<number | 'paste'>(blogs[0]?.id ?? 'paste');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [strategy, setStrategy] = useState('');
  const [count, setCount] = useState(5);
  const [platform, setPlatform] = useState('instagram');

  const [phase, setPhase] = useState<'idle' | 'writing' | 'rendering' | 'done'>('idle');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedBlog = useMemo(() => blogs.find((b) => b.id === blogId), [blogs, blogId]);

  const source = useMemo(() => {
    if (blogId === 'paste') return { title, content };
    return { title: selectedBlog?.title ?? '', content: stripHtml(selectedBlog?.content ?? '') };
  }, [blogId, title, content, selectedBlog]);

  const busy = phase === 'writing' || phase === 'rendering';
  const progress = phase === 'writing' ? 8 : phase === 'rendering' ? Math.round((loaded / Math.max(posts.length, 1)) * 92) + 8 : phase === 'done' ? 100 : 0;

  async function generate() {
    setError(null);
    if (!source.content.trim()) {
      setError('Pick a blog or paste some content first.');
      return;
    }
    setPosts([]);
    setLoaded(0);
    setPhase('writing');
    try {
      const res = await fetch('/api/admin/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: source.title, content: source.content, strategy, count }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Generation failed (${res.status})`);
      }
      const { posts } = (await res.json()) as { posts: Post[] };
      if (!posts?.length) throw new Error('No posts returned.');
      setPosts(posts);
      setPhase('rendering');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setPhase('idle');
    }
  }

  function onImgLoad() {
    setLoaded((n) => {
      const next = n + 1;
      if (next >= posts.length) setPhase('done');
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Social Posts</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Source</label>
              <select
                value={blogId}
                onChange={(e) => setBlogId(e.target.value === 'paste' ? 'paste' : Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                {blogs.map((b) => (
                  <option key={b.id} value={b.id}>{b.published ? '' : '[draft] '}{b.title}</option>
                ))}
                <option value="paste">Paste content manually…</option>
              </select>

              {blogId === 'paste' && (
                <div className="mt-3 space-y-3">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title / topic" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the blog content…" rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Campaign strategy / angle <span className="text-gray-400">(optional)</span></label>
                <input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder='e.g. "Make the Switch" — win over Catholic schools using Scholastic' className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Posts</label>
                  <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    {[3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Platform</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    {PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button onClick={generate} disabled={busy} className="bg-[#02176f] text-white font-medium px-6 py-2.5 rounded-lg hover:bg-[#02176f]/90 disabled:opacity-50 transition-colors">
              {busy ? 'Generating…' : 'Generate posts'}
            </button>
            {(busy || phase === 'done') && (
              <div className="flex-1">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#0088ff] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {phase === 'writing' && 'Writing copy — spinning the blog into on-brand statements…'}
                  {phase === 'rendering' && `Rendering post ${Math.min(loaded + 1, posts.length)} of ${posts.length}…`}
                  {phase === 'done' && `Done — ${posts.length} posts.`}
                </p>
              </div>
            )}
          </div>
          {error && <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>}
        </div>

        {posts.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gray-50 grid place-items-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ogUrl(p, platform)} alt={p.statement} onLoad={onImgLoad} className="w-full max-w-[420px] rounded-lg shadow" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{p.theme}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: { catholic: '#0088ff', parish: '#50db92', public: '#ff6445', virtual: '#42ade2' }[p.mode] || '#0088ff' }}>{p.mode}</span>
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
      </main>
    </div>
  );
}
