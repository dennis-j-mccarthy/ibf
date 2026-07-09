'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PromoKit } from '@/lib/claude';

type Post = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  category: string | null;
  thumbnail: string | null;
};

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="text-[11px] font-medium text-[#0066ff] hover:underline"
    >
      {done ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

function Thumb({ src, className }: { src: string | null; className?: string }) {
  if (!src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-300 text-xs ${className}`}>
        No image
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={`object-cover ${className}`} />;
}

const Avatar = () => (
  <div className="w-8 h-8 rounded-full bg-[#02176f] text-white grid place-items-center text-[11px] font-bold shrink-0">
    IBF
  </div>
);

export default function PromoView({ post }: { post: Post }) {
  const [kit, setKit] = useState<PromoKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/blog/${post.id}/promo`);
    if (res.ok) setKit((await res.json()).content);
    setLoading(false);
  }, [post.id]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError('');
    const res = await fetch(`/api/admin/blog/${post.id}/promo`, { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || 'Generation failed');
      return;
    }
    setKit((await res.json()).content);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-6">
          <h1 className="font-brother text-lg sm:text-xl font-semibold truncate">Promo kit</h1>
          <nav className="flex items-center gap-1 shrink-0 whitespace-nowrap text-sm">
            <a
              href="/admin/blog"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              ← Blog
            </a>
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              className="px-3 py-1.5 rounded-md text-white/90 hover:bg-white/10 hover:text-white transition-colors"
            >
              View post
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-brother text-[#02176f] text-lg font-semibold truncate">{post.title}</h2>
            <p className="text-sm text-gray-500 truncate">
              {post.category ? `${post.category} · ` : ''}/blog/{post.slug}
            </p>
          </div>
          <button
            onClick={generate}
            disabled={busy}
            className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-4 py-2 rounded-md disabled:opacity-60 shrink-0"
          >
            {busy ? 'Generating…' : kit ? 'Regenerate' : 'Generate promos'}
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>
        )}

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : !kit ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            No promos yet. Click <strong>Generate promos</strong> to create instagram, facebook, X, and email copy
            for this post.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Instagram */}
            <section className="space-y-4">
              <h3 className="font-brother text-[#02176f] font-semibold">Instagram</h3>
              {kit.instagram.map((v, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                    <Avatar />
                    <span className="text-sm font-semibold text-[#1a1b1f]">ignatiusbookfairs</span>
                  </div>
                  <Thumb src={post.thumbnail} className="w-full aspect-square" />
                  <div className="p-3">
                    <p className="text-sm whitespace-pre-wrap text-[#1a1b1f]">{v.caption}</p>
                    <p className="text-sm text-[#0066ff] mt-1">
                      {v.hashtags.map((h) => `#${h}`).join(' ')}
                    </p>
                    <div className="mt-2">
                      <CopyButton text={`${v.caption}\n\n${v.hashtags.map((h) => `#${h}`).join(' ')}`} />
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Facebook + X */}
            <div className="space-y-6">
              <section className="space-y-4">
                <h3 className="font-brother text-[#02176f] font-semibold">Facebook</h3>
                {kit.facebook.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Avatar />
                      <div>
                        <p className="text-sm font-semibold text-[#1a1b1f] leading-tight">Ignatius Book Fairs</p>
                        <p className="text-[11px] text-gray-400">Sponsored</p>
                      </div>
                    </div>
                    <p className="px-3 pb-2 text-sm whitespace-pre-wrap text-[#1a1b1f]">{v.post}</p>
                    <Thumb src={post.thumbnail} className="w-full aspect-[1.91/1]" />
                    <div className="p-3">
                      <CopyButton text={v.post} />
                    </div>
                  </div>
                ))}
              </section>

              <section className="space-y-4">
                <h3 className="font-brother text-[#02176f] font-semibold">X</h3>
                {kit.x.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar />
                      <span className="text-sm font-semibold text-[#1a1b1f]">Ignatius Book Fairs</span>
                      <span className="text-[13px] text-gray-400">@ignatiusbookfairs</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-[#1a1b1f]">{v.post}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{v.post.length}/280</span>
                      <CopyButton text={v.post} />
                    </div>
                  </div>
                ))}
              </section>
            </div>

            {/* Email — full width */}
            <section className="lg:col-span-2 space-y-3">
              <h3 className="font-brother text-[#02176f] font-semibold">Email</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm">
                    <span className="text-gray-400">Subject: </span>
                    <span className="font-semibold text-[#1a1b1f]">{kit.email.subject}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{kit.email.preheader}</p>
                </div>
                <div
                  className="px-4 py-4 prose prose-sm max-w-none text-[#1a1b1f] [&_a]:text-[#0066ff]"
                  dangerouslySetInnerHTML={{ __html: kit.email.bodyHtml }}
                />
                <div className="px-4 pb-3">
                  <CopyButton
                    text={`Subject: ${kit.email.subject}\nPreheader: ${kit.email.preheader}\n\n${kit.email.bodyHtml}`}
                  />
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
