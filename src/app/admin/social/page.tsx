import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import SocialStudio from './SocialStudio';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Social Posts | Ignatius Book Fairs',
  robots: { index: false, follow: false },
};

// Middleware guarantees an admin session (admin-only deny-list).
export default async function SocialPostsPage() {
  const blogs = await prisma.blog
    .findMany({
      where: { archived: false },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, content: true, summary: true, publishedAt: true },
      take: 100,
    })
    .catch(() => []);

  return (
    <SocialStudio
      blogs={blogs.map((b) => ({
        id: b.id,
        title: b.title,
        content: b.content,
        summary: b.summary,
        published: b.publishedAt != null,
      }))}
    />
  );
}
