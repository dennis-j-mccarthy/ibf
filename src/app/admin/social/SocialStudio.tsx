'use client';

import { useMemo, useState } from 'react';
import DesignedPosts from './DesignedPosts';

type Book = { title: string; url: string; image: string };
type Blog = { id: number; title: string; content: string; summary: string | null; published: boolean; featuredBooks: Book[] | null };

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();

export default function SocialStudio({ blogs, initialBlogId }: { blogs: Blog[]; initialBlogId?: number }) {
  const preselect = initialBlogId != null && blogs.some((b) => b.id === initialBlogId);
  const [mode, setMode] = useState<'blog' | 'paste' | 'campaign'>(preselect || blogs.length ? 'blog' : 'campaign');
  const [blogId, setBlogId] = useState<number>(preselect ? initialBlogId! : blogs[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [strategy, setStrategy] = useState('');
  const [count, setCount] = useState(5);
  const [reels, setReels] = useState(0);

  const selectedBlog = useMemo(() => blogs.find((b) => b.id === blogId), [blogs, blogId]);

  const source = useMemo(() => {
    const books = (mode === 'blog' ? selectedBlog?.featuredBooks : null) ?? [];
    if (mode === 'blog') return { title: selectedBlog?.title ?? '', content: stripHtml(selectedBlog?.content ?? ''), strategy, books };
    if (mode === 'paste') return { title, content, strategy, books: [] as Book[] };
    return { title, content: '', strategy, books: [] as Book[] }; // campaign (no blog)
  }, [mode, selectedBlog, title, content, strategy]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="bg-[#02176f] text-white">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <h1 className="font-brother text-lg sm:text-xl font-semibold">Campaigns &amp; Social</h1>
          <a href="/admin" className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md transition-colors">Back to admin</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          {/* source mode */}
          <div className="flex flex-wrap gap-2 mb-5">
            {([['blog', 'From a blog post'], ['campaign', 'Campaign strategy (no blog)'], ['paste', 'Paste content']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setMode(k)} className={`text-sm px-4 py-2 rounded-lg border transition-colors ${mode === k ? 'bg-[#02176f] text-white border-[#02176f]' : 'bg-white text-[#02176f] border-gray-300 hover:bg-gray-50'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              {mode === 'blog' && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Blog post</label>
                  <select value={blogId} onChange={(e) => setBlogId(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    {blogs.map((b) => <option key={b.id} value={b.id}>{b.published ? '' : '[draft] '}{b.title}</option>)}
                  </select>
                </div>
              )}
              {mode === 'paste' && (
                <>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title / topic" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the content…" rows={6} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
                </>
              )}
              {mode === 'campaign' && (
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign name (e.g. Make the Switch)" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Campaign strategy / angle {mode === 'campaign' ? '' : <span className="text-gray-400">(optional)</span>}
                </label>
                <textarea value={strategy} onChange={(e) => setStrategy(e.target.value)} rows={mode === 'campaign' ? 5 : 2}
                  placeholder='e.g. "Make the Switch" — win over Catholic schools still using Scholastic; lean on trust, curation, and mission alignment.'
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Square posts (1:1)</label>
                  <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    {[3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Reels (9:16)</label>
                  <select value={reels} onChange={(e) => setReels(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm">
                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              {source.books.length > 0 && (
                <p className="text-xs text-gray-500">Featuring {source.books.length} book{source.books.length > 1 ? 's' : ''} from this post — about half the posts will be book-cover graphics.</p>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-6">
            <DesignedPosts title={source.title} content={source.content} strategy={source.strategy} count={count} reels={reels} books={source.books} />
          </div>
        </div>
      </main>
    </div>
  );
}
