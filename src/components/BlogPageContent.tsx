'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Blog } from '@prisma/client';

interface BlogPageContentProps {
  blogs: Blog[];
}

export default function BlogPageContent({ blogs }: BlogPageContentProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBlogs = searchTerm
    ? blogs.filter(
        (blog) =>
          blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (blog.summary && blog.summary.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : blogs;

  const getCategoryColor = (color: string | null) => {
    const colorMap: Record<string, string> = {
      orange: 'bg-[#ff6445]',
      green: 'bg-[#00c853]',
      blue: 'bg-[#0066ff]',
      red: 'bg-[#c83200]',
    };
    return colorMap[color || 'orange'] || 'bg-[#ff6445]';
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
            <h1 className="font-handsome text-4xl md:text-5xl lg:text-6xl mb-6">
              <span className="text-[#ff6445]">CATHOLIC</span>{' '}
              <span className="text-white">BOOK FAIR</span>{' '}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {filteredBlogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} categoryColor={getCategoryColor(blog.color)} />
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
}

function BlogCard({ blog, categoryColor }: BlogCardProps) {
  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Link href={`/blog/${blog.slug}`} className="group">
      <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
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
          {blog.category && (
            <div className={`absolute top-3 left-3 ${categoryColor} px-3 py-1 rounded-full`}>
              <span className="text-white text-xs font-brother font-semibold uppercase tracking-wide">
                {blog.category}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <h2 className="font-brother text-lg font-bold text-gray-800 mb-2 group-hover:text-[#0066ff] transition-colors line-clamp-2">
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
    </Link>
  );
}
