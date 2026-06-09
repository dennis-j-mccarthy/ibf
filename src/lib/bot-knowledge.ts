import prisma from '@/lib/prisma';

export type BotLink = { label: string; url: string };

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'answer';
}

// Returns a slug unique across BotAnswer, ignoring the row being edited (excludeId).
export async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // Small dataset: a simple loop is fine and clearer than a clever query.
  while (true) {
    const existing = await prisma.botAnswer.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

// Coerce arbitrary input into a clean BotLink[] (drops entries missing a url).
export function normalizeLinks(input: unknown): BotLink[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((l) => ({
      label: typeof l?.label === 'string' ? l.label.trim() : '',
      url: typeof l?.url === 'string' ? l.url.trim() : '',
    }))
    .filter((l) => l.url.length > 0);
}
