import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PromoView from './PromoView';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Promo kit | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

export default async function PromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const blogId = parseInt(id, 10);
  if (isNaN(blogId)) notFound();

  const post = await prisma.blog.findUnique({
    where: { id: blogId },
    select: { id: true, title: true, slug: true, summary: true, category: true, thumbnail: true, content: true },
  });
  if (!post) notFound();

  return <PromoView post={post} />;
}
