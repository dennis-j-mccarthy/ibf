import { prisma } from '@/lib/prisma';

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// A slug unique across blog posts (ignoring the post being edited).
export async function uniqueBlogSlug(base: string, excludeId?: number): Promise<string> {
  const root = slugify(base) || 'post';
  let slug = root;
  let n = 1;
  // Bounded loop; slugs collide rarely.
  for (let i = 0; i < 200; i++) {
    const existing = await prisma.blog.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${root}-${++n}`;
  }
  return `${root}-${Date.now()}`;
}
