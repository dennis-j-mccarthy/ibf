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

// --- Website publishing ------------------------------------------------------
//
// The /faqs page renders exactly these five sections, in this order, each with
// its own header image; it drops anything else. Keep this list and
// categoryConfig/categoryOrder in FAQsPageContent.tsx in step, or an entry
// tagged with an unknown section will publish into a void.
export const SITE_SECTIONS = [
  'Turning the Page',
  'Flow of the Fair',
  'Literature Logistics',
  'Reader Rewards',
  'Your Concerns Our Commitments',
] as const;

export type SiteSection = (typeof SITE_SECTIONS)[number];

// The site's mode filter. "Both" shows in Catholic and Public mode alike.
export const SITE_VERSIONS = ['Catholic', 'Public', 'Both'] as const;

export type SiteVersion = (typeof SITE_VERSIONS)[number];

export function isSiteSection(value: unknown): value is SiteSection {
  return typeof value === 'string' && (SITE_SECTIONS as readonly string[]).includes(value);
}

export function isSiteVersion(value: unknown): value is SiteVersion {
  return typeof value === 'string' && (SITE_VERSIONS as readonly string[]).includes(value);
}

// --- Published coordinator FAQ documents -------------------------------------
//
// The four PDFs on the resources page. An answer can appear in several of them
// (14 of the 28 questions extracted from the PDFs do), so this is stored as a
// comma-separated list rather than a single value.
export const FAQ_DOCUMENTS = [
  { key: 'catholic-in-person', label: 'Catholic In-Person', file: '/documents/faqs-in-person-catholic-3-12.pdf' },
  { key: 'parish-in-person', label: 'Parish In-Person', file: '/documents/faq-in-person-parish.pdf' },
  { key: 'public-in-person', label: 'Public In-Person', file: '/documents/faq-in-person-public-4-17.pdf' },
  { key: 'virtual', label: 'Virtual', file: '/documents/faqs-virtual-3-12.pdf' },
] as const;

export type FaqDocumentKey = (typeof FAQ_DOCUMENTS)[number]['key'];

const DOC_KEYS = FAQ_DOCUMENTS.map((d) => d.key) as readonly string[];

export function parseDocs(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => DOC_KEYS.includes(s));
}

// Normalizes to a stable, de-duplicated, validated list; empty becomes null so
// "belongs to no document" is one value rather than '' and null both meaning it.
export function serializeDocs(values: unknown): string | null {
  const list = Array.isArray(values) ? values : typeof values === 'string' ? values.split(',') : [];
  const clean = [...new Set(list.map((v) => String(v).trim()).filter((v) => DOC_KEYS.includes(v)))];
  clean.sort((a, b) => DOC_KEYS.indexOf(a) - DOC_KEYS.indexOf(b));
  return clean.length ? clean.join(',') : null;
}

export function docLabel(key: string): string {
  return FAQ_DOCUMENTS.find((d) => d.key === key)?.label ?? key;
}

// --- Similarity & clustering -------------------------------------------------
//
// Used to group answers that are versions of the same question. Deliberately
// shared between the reconcile screen and the import/backfill scripts so a
// cluster the tool shows is the same cluster a script would act on.

export function tokens(s: string): Set<string> {
  return new Set(
    answerToText(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

// Jaccard overlap: shared words over total distinct words. Survives HTML
// wrappers, punctuation and curly-quote drift.
export function similarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}

export const QUESTION_MATCH = 0.6; // two questions are "the same question"
export const ANSWER_IDENTICAL = 0.95;
export const ANSWER_NEAR = 0.6;

export type VariantBand = 'identical' | 'drifted' | 'different';

export function bandFor(minAnswerSimilarity: number): VariantBand {
  if (minAnswerSimilarity >= ANSWER_IDENTICAL) return 'identical';
  if (minAnswerSimilarity >= ANSWER_NEAR) return 'drifted';
  return 'different';
}

// Groups rows whose questions are effectively the same. Order-stable so the
// screen doesn't reshuffle between loads.
export function clusterByQuestion<T extends { question: string }>(rows: T[]): T[][] {
  const clusters: T[][] = [];
  for (const row of rows) {
    const hit = clusters.find((c) => similarity(c[0].question, row.question) >= QUESTION_MATCH);
    if (hit) hit.push(row);
    else clusters.push([row]);
  }
  return clusters;
}

// Lowest pairwise answer similarity in a cluster — the worst disagreement.
export function lowestAnswerSimilarity(rows: { answer: string }[]): number {
  let min = 1;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      min = Math.min(min, similarity(rows[i].answer, rows[j].answer));
    }
  }
  return min;
}

// Words present in `text` but not in `reference` — what makes this version
// unique. Used to highlight drift rather than render a full character diff.
export function uniqueWords(text: string, reference: string): Set<string> {
  const ref = tokens(reference);
  const out = new Set<string>();
  for (const w of tokens(text)) if (!ref.has(w)) out.add(w);
  return out;
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
