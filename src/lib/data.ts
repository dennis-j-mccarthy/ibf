import prisma from '@/lib/prisma';
import { answerToHtml } from '@/lib/bot-knowledge';

type FAQish = {
  id: number;
  question: string;
  answer: string;
  pageTitle: string | null;
  version: string;
  order: number;
  isActive: boolean;
  slug: string | null;
};

// Where the site's FAQ content comes from. The knowledge base is the source of
// truth for the content itself; this switch controls whether the public pages
// read it yet. Set FAQ_SOURCE=kb to serve from the knowledge base.
//
// Kept as a switch rather than a straight cutover so the two can be compared on
// the real site and reverted instantly by changing one environment variable.
export const faqSource = () => (process.env.FAQ_SOURCE === 'kb' ? 'kb' : 'legacy');

// Knowledge-base rows, shaped exactly like FAQ rows so every consumer
// (the /faqs page, the homepage block, the tagging UI) is unchanged.
//
// The old table modelled "on the homepage" and "in a section" as separate rows;
// the KB models them as flags on one row, so the requested pageTitle decides
// which set comes back.
async function getFAQsFromKB(options?: { pageTitle?: string; version?: string }): Promise<FAQish[]> {
  const targetVersion = options?.version ?? 'Catholic';
  const wantsHome = options?.pageTitle === 'Home';

  const rows = await prisma.botAnswer.findMany({
    where: {
      isActive: true,
      publishToSite: true,
      // Answers retired by a merge are excluded via isActive, which the
      // reconcile step clears on them.
      OR: [{ siteVersion: targetVersion }, { siteVersion: 'Both' }],
      ...(wantsHome ? { siteFeatured: true } : { siteCategory: { not: null } }),
    },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });

  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    // Legacy FAQ answers were HTML and the page renders them as HTML, so
    // plain-text KB answers have to be promoted to paragraphs here.
    answer: answerToHtml(r.answer),
    // The page strips a "FAQs " prefix to get the section heading.
    pageTitle: wantsHome ? 'Home' : `FAQs ${r.siteCategory}`,
    version: r.siteVersion ?? '',
    order: r.order,
    isActive: r.isActive,
    slug: r.slug,
  }));
}

async function getFAQsFromLegacy(options?: { pageTitle?: string; version?: string }): Promise<FAQish[]> {
  const targetVersion = options?.version ?? 'Catholic';

  return prisma.fAQ.findMany({
    where: {
      isActive: true,
      // Match exact version, "Both", or comma-separated that includes the version
      OR: [
        { version: targetVersion },
        { version: 'Both' },
        { version: { contains: targetVersion } },
      ],
      // Optionally filter by page
      ...(options?.pageTitle && { pageTitle: options.pageTitle }),
    },
    orderBy: { order: 'asc' },
  });
}

export async function getFAQs(
  options?: { pageTitle?: string; version?: string; source?: 'kb' | 'legacy' }
): Promise<FAQish[]> {
  const source = options?.source ?? faqSource();
  return source === 'kb' ? getFAQsFromKB(options) : getFAQsFromLegacy(options);
}

export async function getResources() {
  const resources = await prisma.resource.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });
  return resources;
}

export async function getResourcesByCategory(category: string) {
  const resources = await prisma.resource.findMany({
    where: { 
      isActive: true,
      category: category,
    },
    orderBy: { order: 'asc' },
  });
  return resources;
}

export async function getBlogs(options?: { category?: string; featured?: boolean; limit?: number }) {
  const blogs = await prisma.blog.findMany({
    where: {
      archived: false,
      publishedAt: { not: null }, // only published posts are public (drafts hidden)
      ...(options?.category && { category: options.category }),
      ...(options?.featured !== undefined && { featured: options.featured }),
    },
    orderBy: { publishedAt: 'desc' },
    ...(options?.limit && { take: options.limit }),
  });
  return blogs;
}

export async function getBlogBySlug(slug: string) {
  // Public read: a draft (publishedAt null) or archived post is treated as not
  // found, so drafts aren't reachable by direct URL either.
  const blog = await prisma.blog.findFirst({
    where: { slug, archived: false, publishedAt: { not: null } },
  });
  return blog;
}

export async function getBotAnswers() {
  return prisma.botAnswer.findMany({
    where: { isActive: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
  });
}

export async function getBotAnswerBySlug(slug: string) {
  return prisma.botAnswer.findFirst({ where: { slug, isActive: true } });
}

export async function getTestimonials(options?: { type?: string }) {
  const testimonials = await prisma.testimonial.findMany({
    where: { 
      isActive: true,
      ...(options?.type && { type: options.type }),
    },
    orderBy: { order: 'asc' },
  });
  return testimonials;
}
