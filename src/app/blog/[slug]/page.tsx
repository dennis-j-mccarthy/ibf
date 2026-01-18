import { getBlogBySlug, getBlogs } from '@/lib/data';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    return {
      title: 'Blog Post Not Found | Ignatius Book Fairs',
    };
  }

  return {
    title: `${blog.title} | Ignatius Book Fairs`,
    description: blog.summary || `Read about ${blog.title} on Ignatius Book Fairs.`,
    openGraph: {
      title: blog.title,
      description: blog.summary || undefined,
      images: blog.thumbnail ? [blog.thumbnail] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const blogs = await getBlogs();
  return blogs.map((blog: { slug: string }) => ({
    slug: blog.slug,
  }));
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) {
    notFound();
  }

  const formattedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

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
        {blog.thumbnail && (
          <div className="absolute inset-0 z-0">
            <Image
              src={blog.thumbnail}
              alt={blog.title}
              fill
              className="object-cover opacity-20"
              priority
            />
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link
              href="/blog"
              className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to News
            </Link>

            {/* Category Badge */}
            {blog.category && (
              <div className={`inline-block ${getCategoryColor(blog.color)} px-4 py-1.5 rounded-full mb-4`}>
                <span className="text-white text-sm font-brother font-semibold uppercase tracking-wide">
                  {blog.category}
                </span>
              </div>
            )}

            <h1 className="font-handsome text-3xl md:text-4xl lg:text-5xl text-white mb-4">
              {blog.title}
            </h1>

            {formattedDate && (
              <p className="text-white/70 text-sm">{formattedDate}</p>
            )}
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="bg-[#f5f5eb] py-16">
        <div className="container mx-auto px-4">
          <article className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8 md:p-12">
            {/* Featured Image */}
            {blog.thumbnail && (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-8 -mt-20 shadow-lg">
                <Image
                  src={blog.thumbnail}
                  alt={blog.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Summary */}
            {blog.summary && (
              <p className="text-xl text-gray-600 mb-8 leading-relaxed border-l-4 border-[#0066ff] pl-4">
                {blog.summary}
              </p>
            )}

            {/* Embedded Video */}
            {blog.embedHtml && (
              <div 
                className="mb-8 aspect-video rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: blog.embedHtml }} 
              />
            )}

            {/* Main Content */}
            {blog.content && (
              <div 
                className="prose prose-lg max-w-none prose-headings:font-brother prose-headings:text-gray-800 prose-p:text-gray-600 prose-a:text-[#0066ff] prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: blog.content }} 
              />
            )}

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="font-brother font-bold text-gray-800 mb-4">Share this article</h3>
              <div className="flex gap-4">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://ignatiusbookfairs.com/blog/${blog.slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#1877f2] flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                  </svg>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://ignatiusbookfairs.com/blog/${blog.slug}`)}&text=${encodeURIComponent(blog.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(blog.title)}&body=${encodeURIComponent(`Check out this article: https://ignatiusbookfairs.com/blog/${blog.slug}`)}`}
                  className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </a>
              </div>
            </div>
          </article>

          {/* Back to Blog Link */}
          <div className="text-center mt-8">
            <Link
              href="/blog"
              className="inline-flex items-center text-[#0066ff] font-semibold hover:underline"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to All News
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
