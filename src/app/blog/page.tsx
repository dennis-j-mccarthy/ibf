import { getBlogs } from '@/lib/data';
import BlogPageContent from '@/components/BlogPageContent';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catholic Book Fair News | Ignatius Book Fairs',
  description: 'Stay up to date with the latest news, tips, and success stories from Catholic book fairs across the country.',
};

export default async function BlogPage() {
  const blogs = await getBlogs();

  return <BlogPageContent blogs={blogs} />;
}
