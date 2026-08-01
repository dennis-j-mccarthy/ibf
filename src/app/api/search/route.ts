import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchResult = {
  type: 'resource' | 'faq' | 'page';
  title: string;
  snippet?: string;
  href: string;
  badge: string;
};

// Static marketing pages (title + keyword matching only — there is no full-text
// index of page bodies). Intentionally excludes /press-room (removed from nav).
const STATIC_PAGES: { title: string; href: string; keywords: string }[] = [
  { title: 'Home', href: '/', keywords: 'home book fairs ignatius catholic public host' },
  { title: 'About', href: '/about', keywords: 'about story mission ave maria ignatius press partnership' },
  { title: 'FAQs', href: '/faqs', keywords: 'faq frequently asked questions help support' },
  { title: 'Book Fair Resources', href: '/bookfair-resources', keywords: 'resources guides flyers videos downloads tutorials printables' },
  // /book-battles intentionally hidden from search for now — the interest form
  // is the destination for battle searches (incl. "ibb").
  { title: 'Book Battle Interest Form', href: '/book-battle-interest-form', keywords: 'book battle battles bok battle ibb competition reading interest form sign up' },
  { title: 'Catholic In-Person Guide', href: '/guide/catholic-in-person', keywords: 'guide catholic in person setup how to run a fair' },
  { title: 'Terms of Service', href: '/terms-of-service', keywords: 'terms service legal policy' },
];

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function snippet(text: string, q: string, len = 130) {
  const clean = stripHtml(text);
  const i = clean.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return clean.slice(0, len) + (clean.length > len ? '…' : '');
  const start = Math.max(0, i - 40);
  const end = start + len;
  return (start > 0 ? '…' : '') + clean.slice(start, end) + (clean.length > end ? '…' : '');
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const [resources, faqs] = await Promise.all([
    prisma.resource.findMany({
      where: {
        isActive: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { order: 'asc' },
      take: 6,
    }),
    prisma.fAQ.findMany({
      where: {
        isActive: true,
        OR: [
          { question: { contains: q, mode: 'insensitive' } },
          { answer: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { order: 'asc' },
      take: 6,
    }),
  ]);

  const results: SearchResult[] = [];

  // Resources first — clicking one opens its modal on the resources page.
  for (const r of resources) {
    if (!r.slug) continue;
    results.push({
      type: 'resource',
      title: r.title,
      snippet: r.category || (r.description ? stripHtml(r.description).slice(0, 100) : undefined),
      href: `/bookfair-resources?resource=${encodeURIComponent(r.slug)}`,
      badge: 'Resource',
    });
  }

  for (const f of faqs) {
    results.push({
      type: 'faq',
      title: f.question,
      snippet: snippet(f.answer, q),
      href: '/faqs',
      badge: 'FAQ',
    });
  }

  const ql = q.toLowerCase();
  for (const p of STATIC_PAGES) {
    if (p.title.toLowerCase().includes(ql) || p.keywords.includes(ql)) {
      results.push({ type: 'page', title: p.title, href: p.href, badge: 'Page' });
    }
  }

  return NextResponse.json({ results });
}
