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

// --- Answer formatting -------------------------------------------------------
//
// A BotAnswer.answer holds EITHER legacy plain text (newline-separated
// paragraphs, how the first 118 entries were written) OR rich text as HTML
// (what the editor now produces, and what FAQs imported from the website
// carry). Rather than migrate the corpus or keep two columns in sync, these
// two helpers normalize at read time: answerToHtml for anything that renders
// as a web page, answerToText for the chatbot feed, which must stay markup-free.

const BLOCK_TAG = /<(p|div|ul|ol|li|br|h[1-6]|figure|table|blockquote|strong|em|a)\b/i;

export function isHtmlAnswer(answer: string): boolean {
  return BLOCK_TAG.test(answer);
}

// Render-ready HTML. Legacy plain text becomes one <p> per non-empty line so it
// doesn't collapse into a single run-on paragraph.
export function answerToHtml(answer: string): string {
  const value = answer?.trim() ?? '';
  if (!value) return '';
  if (isHtmlAnswer(value)) return value;
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘',
  '&rdquo;': '”', '&ldquo;': '“', '&mdash;': '—', '&ndash;': '–',
  '&hellip;': '…',
};

// Plain text for the chatbot feed: block boundaries become spaces, tags are
// dropped, entities decoded, whitespace collapsed onto a single line.
export function answerToText(answer: string): string {
  const value = answer ?? '';
  if (!isHtmlAnswer(value)) return value.replace(/\s*\n\s*/g, ' ').trim();
  return value
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6]|\/tr)\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
