'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Blog } from '@prisma/client';
import { useVersion } from '@/contexts/VersionContext';

function getBlogTags(category: string | null): { catholic: boolean; public: boolean } {
  const cat = category || '';
  if (cat === 'Both' || cat === 'Catholic,Public' || cat === 'Public,Catholic') {
    return { catholic: true, public: true };
  }
  return {
    catholic: cat.includes('Catholic'),
    public: cat.includes('Public'),
  };
}

interface BlogPageContentProps {
  blogs: Blog[];
}

export default function BlogPageContent({ blogs: initialBlogs }: BlogPageContentProps) {
  const { isCatholic, taggingMode } = useVersion();
  const [searchTerm, setSearchTerm] = useState('');
  const [blogs, setBlogs] = useState(initialBlogs);

  const versionCategory = isCatholic ? 'Catholic' : 'Public';
  const versionBlogs = taggingMode
    ? blogs // Show all blogs in tagging mode
    : blogs.filter((blog) => {
        const cat = blog.category || '';
        return cat === versionCategory || cat === 'Both' || cat.includes(versionCategory);
      });

  const filteredBlogs = searchTerm
    ? versionBlogs.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (blog.summary && blog.summary.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : versionBlogs;

  const getCategoryColor = (color: string | null) => {
    const colorMap: Record<string, string> = {
      orange: 'bg-[#ff6445]',
      green: 'bg-[#00c853]',
      blue: 'bg-[#0066ff]',
      red: 'bg-[#c83200]',
    };
    return colorMap[color || 'orange'] || 'bg-[#ff6445]';
  };

  const handleBlogTagToggle = async (blogId: number, toggleType: 'catholic' | 'public') => {
    const blog = blogs.find((b) => b.id === blogId);
    if (!blog) return;

    const tags = getBlogTags(blog.category);
    const newTags = { ...tags };
    newTags[toggleType] = !newTags[toggleType];

    let newCategory = '';
    if (newTags.catholic && newTags.public) newCategory = 'Both';
    else if (newTags.catholic) newCategory = 'Catholic';
    else if (newTags.public) newCategory = 'Public';

    setBlogs((prev) => prev.map((b) => (b.id === blogId ? { ...b, category: newCategory } : b)));

    try {
      await fetch(`/api/blogs/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      });
    } catch (error) {
      console.error('Error updating blog tag:', error);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-[#0066ff] pt-16 pb-24 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/Blog-Site.png"
            alt="Book Fair News"
            fill
            className="object-cover opacity-30"
            priority
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 style={{ fontFamily: 'brother-1816, sans-serif', fontSize: '75px', fontWeight: 900, marginBottom: '20px', lineHeight: '105%' }}>
              <span className="text-[#ff6445]">BOOK FAIR</span>{' '}
              <span className="text-[#00c853]">NEWS</span>
            </h1>
            <p className="text-white text-lg leading-relaxed max-w-2xl mx-auto">
              Stay up to date with the latest news, tips, and success stories from Catholic book fairs across the country.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mt-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-3 rounded-full bg-white/90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00c853]"
              />
              <svg
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="bg-[#f5f5eb] py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {filteredBlogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                categoryColor={getCategoryColor(blog.color)}
                taggingMode={taggingMode}
                onTagToggle={handleBlogTagToggle}
              />
            ))}
          </div>

          {filteredBlogs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No articles found matching your search.' : 'No articles available.'}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

interface BlogCardProps {
  blog: Blog;
  categoryColor: string;
  taggingMode: boolean;
  onTagToggle: (blogId: number, toggleType: 'catholic' | 'public') => void;
}

function BlogCard({ blog, categoryColor, taggingMode, onTagToggle }: BlogCardProps) {
  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const tags = getBlogTags(blog.category);

  const card = (
    <article className={`bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col relative ${taggingMode ? 'ring-2 ring-purple-300' : ''}`}>
      {/* Thumbnail */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {blog.thumbnail ? (
          <Image
            src={blog.thumbnail}
            alt={blog.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full ${categoryColor} flex items-center justify-center`}>
            <span className="text-white text-4xl font-handsome">IBF</span>
          </div>
        )}

        {/* Category Badge */}
        {blog.category && !taggingMode && (
          <div className={`absolute top-3 left-3 ${categoryColor} px-3 py-1 rounded-full`}>
            <span className="text-white text-xs font-brother font-semibold uppercase tracking-wide">
              {blog.category}
            </span>
          </div>
        )}
      </div>

      {/* Tag toggles in tagging mode */}
      {taggingMode && (
        <div className="absolute top-3 right-3 z-10 flex gap-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagToggle(blog.id, 'catholic'); }}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${tags.catholic ? 'bg-[#0088ff] text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            title="Catholic"
          >C</button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagToggle(blog.id, 'public'); }}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${tags.public ? 'bg-[#ff6445] text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
            title="Public"
          >P</button>
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h2 className="font-brother font-bold text-gray-800 mb-2 group-hover:text-[#0066ff] transition-colors line-clamp-2" style={{ fontSize: '20px', lineHeight: '120%' }}>
          {blog.title}
        </h2>

        {blog.summary && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-grow">
            {blog.summary}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          {formattedDate && (
            <span className="text-gray-400 text-xs">{formattedDate}</span>
          )}
          <span className="text-[#0066ff] text-sm font-semibold group-hover:underline">
            Read More →
          </span>
        </div>
      </div>
    </article>
  );

  // In tagging mode, don't wrap in Link so clicks on tag buttons work
  if (taggingMode) {
    return <div className="group cursor-pointer" onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}>{card}</div>;
  }

  return (
    <Link href={`/blog/${blog.slug}`} className="group">
      {card}
    </Link>
  );
}
