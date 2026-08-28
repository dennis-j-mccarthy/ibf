// Brings every website FAQ into the knowledge base so the KB can become the
// single source of truth for Q&A content.
//
//   npx tsx --env-file=.env.local prisma/import-faqs-to-kb.ts           # dry run
//   npx tsx --env-file=.env.local prisma/import-faqs-to-kb.ts --apply   # writes
//
// Two things make this more than a copy:
//
// 1. The site expresses Catholic vs Public by storing the SAME question twice
//    with DIFFERENT answers -- "Where can a fair be hosted?" says "schools"
//    for Public and "schools and parishes" for Catholic. Collapsing on the
//    question alone would throw away the Catholic wording, so each distinct
//    answer is kept as its own KB entry ("variant"), carrying its own
//    siteVersion. Rows that share an answer are merged and their versions
//    unioned (Public + Catholic => Both).
//
// 2. Roughly 30 site FAQs were already copied into the KB by hand. Matching is
//    therefore done on question AND answer similarity, not question alone --
//    matching on the question would map both variants onto whichever copy the
//    lookup happened to find first.

import { PrismaClient } from '@prisma/client';
import { slugify, answerToText } from '../src/lib/bot-knowledge';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

const normQ = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s: string) =>
  new Set(
    answerToText(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );

// Jaccard overlap on word sets — robust to HTML wrappers and light edits.
function similarity(a: string, b: string): number {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}

const MATCH_THRESHOLD = 0.7;

// The five sections the /faqs page renders, in display order. Anything outside
// this list is dropped by the page, so an import that invented a new section
// name would silently publish into a void.
export const SITE_SECTIONS = [
  'Turning the Page',
  'Flow of the Fair',
  'Literature Logistics',
  'Reader Rewards',
  'Your Concerns Our Commitments',
] as const;

// pageTitle carries a redundant "FAQs " prefix; strip it to get the section.
// "Home" is not a section — it's the homepage block, tracked by siteFeatured.
const toSiteCategory = (pageTitle: string | null): string | null => {
  if (!pageTitle) return null;
  const t = pageTitle.replace(/^FAQs\s+/i, '').trim();
  return t === 'Home' ? null : t || null;
};

// Union a set of FAQ.version strings into one site version.
function unionVersions(versions: string[]): string | null {
  let catholic = false;
  let isPublic = false;
  for (const raw of versions) {
    const v = (raw || '').trim();
    if (!v) continue;
    if (v === 'Both' || v.includes('Catholic')) catholic = true;
    if (v === 'Both' || v.includes('Public')) isPublic = true;
  }
  if (catholic && isPublic) return 'Both';
  if (catholic) return 'Catholic';
  if (isPublic) return 'Public';
  return null; // untagged on the site == hidden in both modes
}

function uniqueSlugFor(base: string, taken: Set<string>): string {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  while (taken.has(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  taken.add(candidate);
  return candidate;
}

async function main() {
  const [faqs, kb] = await Promise.all([
    prisma.fAQ.findMany({ orderBy: [{ id: 'asc' }] }),
    prisma.botAnswer.findMany(),
  ]);

  console.log(`Website FAQs: ${faqs.length} rows (${faqs.filter((f) => f.isActive).length} active)`);
  console.log(`KB entries:   ${kb.length}`);

  // --- Collapse site rows into variants: one per distinct answer ------------
  type Variant = {
    question: string;
    answer: string;
    versions: string[];
    pages: (string | null)[];
    order: number;
    isActive: boolean;
    faqId: number;
  };

  const byQuestion = new Map<string, Variant[]>();
  for (const f of faqs) {
    const key = normQ(f.question);
    const list = byQuestion.get(key) ?? [];
    // Merge into an existing variant when the answer is effectively the same.
    const twin = list.find((v) => similarity(v.answer, f.answer) >= 0.98);
    if (twin) {
      twin.versions.push(f.version);
      twin.pages.push(f.pageTitle);
      twin.isActive = twin.isActive || f.isActive;
    } else {
      list.push({
        question: f.question,
        answer: f.answer,
        versions: [f.version],
        pages: [f.pageTitle],
        order: f.order ?? 0,
        isActive: f.isActive,
        faqId: f.id,
      });
    }
    byQuestion.set(key, list);
  }

  const variants = [...byQuestion.values()].flat();
  const multiVariant = [...byQuestion.entries()].filter(([, v]) => v.length > 1);

  console.log(
    `\nCollapsed ${faqs.length} rows into ${variants.length} variants across ${byQuestion.size} unique questions.`
  );
  if (multiVariant.length) {
    console.log(`\n${multiVariant.length} question(s) keep mode-specific answers (NOT merged):`);
    for (const [, vs] of multiVariant) {
      console.log(`   "${vs[0].question.slice(0, 62)}"`);
      for (const v of vs) {
        console.log(
          `      → ${unionVersions(v.versions) ?? 'untagged'}: ${answerToText(v.answer).slice(0, 72)}…`
        );
      }
    }
  }

  // --- Match each variant against the existing KB ---------------------------
  const kbByQuestion = new Map<string, typeof kb>();
  for (const k of kb) {
    const key = normQ(k.question);
    kbByQuestion.set(key, [...(kbByQuestion.get(key) ?? []), k]);
  }
  const takenSlugs = new Set(kb.map((k) => k.slug));
  const claimed = new Set<number>();

  const toUpdate: Array<{ v: Variant; kbId: number; score: number }> = [];
  const toCreate: Array<{ v: Variant; slug: string; reason: string }> = [];

  for (const v of variants) {
    const candidates = (kbByQuestion.get(normQ(v.question)) ?? []).filter(
      (c) => !claimed.has(c.id)
    );
    let best: { id: number; score: number } | null = null;
    for (const c of candidates) {
      const score = similarity(c.answer, v.answer);
      if (!best || score > best.score) best = { id: c.id, score };
    }
    if (best && best.score >= MATCH_THRESHOLD) {
      claimed.add(best.id);
      toUpdate.push({ v, kbId: best.id, score: best.score });
    } else {
      toCreate.push({
        v,
        slug: uniqueSlugFor(v.question, takenSlugs),
        reason: candidates.length
          ? `same question in KB but answer differs (best ${best ? best.score.toFixed(2) : '0'})`
          : 'question not in KB',
      });
    }
  }

  console.log(`\nMatched to existing KB entries (will be tagged for the site): ${toUpdate.length}`);
  for (const u of toUpdate) {
    console.log(
      `   = [${(u.score * 100).toFixed(0)}%] ${u.v.question.slice(0, 58)} → ${unionVersions(u.v.versions) ?? 'untagged'}`
    );
  }

  console.log(`\nNew KB entries to create: ${toCreate.length}`);
  for (const c of toCreate) {
    console.log(
      `   + ${c.v.question.slice(0, 58)} → ${unionVersions(c.v.versions) ?? 'untagged'}  (${c.reason})`
    );
  }

  // --- Section tagging report ----------------------------------------------
  const sectionOf = (v: Variant) => toSiteCategory(v.pages.find((p) => p && p !== 'Home') ?? null);
  const bySection = new Map<string, number>();
  let homepageOnly = 0;
  const invalid: string[] = [];
  for (const v of variants) {
    const s = sectionOf(v);
    const onHome = v.pages.some((p) => p === 'Home');
    if (!s) {
      if (onHome) homepageOnly += 1;
      else invalid.push(`${v.question} (pages: ${JSON.stringify(v.pages)})`);
      continue;
    }
    if (!(SITE_SECTIONS as readonly string[]).includes(s)) invalid.push(`${v.question} → "${s}"`);
    bySection.set(s, (bySection.get(s) ?? 0) + 1);
  }

  console.log('\nSection tags the import will write (siteCategory):');
  for (const s of SITE_SECTIONS) console.log(`   ${String(bySection.get(s) ?? 0).padStart(3)}  ${s}`);
  console.log(`   ${String(homepageOnly).padStart(3)}  (homepage only — siteFeatured, no section)`);
  const alsoFeatured = variants.filter((v) => v.pages.some((p) => p === 'Home')).length;
  console.log(`   ${String(alsoFeatured).padStart(3)}  total flagged siteFeatured (homepage block)`);
  if (invalid.length) {
    console.log(`\n   !! ${invalid.length} variant(s) with a section the site cannot render:`);
    for (const i of invalid) console.log(`      ${i}`);
  } else {
    console.log('\n   All variants map to a section the /faqs page renders (or the homepage).');
  }

  console.log(
    `\nAfter import: ${toUpdate.length + toCreate.length} of ${variants.length} site variants represented in the KB (100% coverage).`
  );

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.');
    return;
  }

  const siteFields = (v: Variant) => ({
    publishToSite: true,
    siteFeatured: v.pages.some((p) => p === 'Home'),
    siteVersion: unionVersions(v.versions),
    siteCategory: toSiteCategory(v.pages.find((p) => p && p !== 'Home') ?? null),
    faqId: v.faqId,
  });

  let created = 0;
  let updated = 0;
  for (const { v, slug } of toCreate) {
    await prisma.botAnswer.create({
      data: {
        question: v.question,
        answer: v.answer,
        slug,
        audience: 'All',
        category: v.pages.find(Boolean) ?? null,
        order: v.order,
        isActive: v.isActive,
        ...siteFields(v),
      },
    });
    created += 1;
  }
  for (const { v, kbId } of toUpdate) {
    await prisma.botAnswer.update({ where: { id: kbId }, data: siteFields(v) });
    updated += 1;
  }

  console.log(`\nDone. Created ${created}, updated ${updated}.`);
  console.log(`KB now holds ${await prisma.botAnswer.count()} entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
