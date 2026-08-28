// Repairs knowledge-base answers that are flagged for the website but cannot
// actually appear there: no section (and not on the homepage), or no mode.
// Values are recovered from the FAQ row the answer was imported from.
//
//   npx tsx --env-file=.env.local prisma/repair-unpublishable.ts          # dry run
//   npx tsx --env-file=.env.local prisma/repair-unpublishable.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const toSection = (pageTitle: string | null): string | null => {
  if (!pageTitle) return null;
  const t = pageTitle.replace(/^FAQs\s+/i, '').trim();
  return t === 'Home' ? null : t || null;
};

const toVersion = (version: string): string | null => {
  const v = (version || '').trim();
  if (!v) return null;
  const catholic = v === 'Both' || v.includes('Catholic');
  const isPublic = v === 'Both' || v.includes('Public');
  if (catholic && isPublic) return 'Both';
  if (catholic) return 'Catholic';
  if (isPublic) return 'Public';
  return null;
};

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function main() {
  const broken = await prisma.botAnswer.findMany({
    where: {
      publishToSite: true,
      OR: [{ AND: [{ siteCategory: null }, { siteFeatured: false }] }, { siteVersion: null }],
    },
  });

  console.log(`Answers flagged for the site that cannot render: ${broken.length}\n`);
  if (!broken.length) return;

  const faqs = await prisma.fAQ.findMany();
  const fixes: { id: number; section: string | null; version: string | null; q: string }[] = [];

  for (const b of broken) {
    // Prefer the exact FAQ row this was imported from; fall back to matching
    // on the question so hand-created answers can be repaired too.
    const source =
      (b.faqId ? faqs.find((f) => f.id === b.faqId) : undefined) ??
      faqs.find((f) => norm(f.question) === norm(b.question));

    if (!source) {
      console.log(`  ?  #${b.id} no matching FAQ row — needs a human: ${b.question.slice(0, 58)}`);
      continue;
    }
    fixes.push({
      id: b.id,
      section: b.siteCategory ?? toSection(source.pageTitle),
      version: b.siteVersion ?? toVersion(source.version),
      q: b.question,
    });
  }

  for (const f of fixes) {
    console.log(`  #${f.id}  section=${JSON.stringify(f.section)} mode=${JSON.stringify(f.version)}  ${f.q.slice(0, 56)}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.');
    return;
  }

  for (const f of fixes) {
    await prisma.botAnswer.update({
      where: { id: f.id },
      data: { siteCategory: f.section, siteVersion: f.version },
    });
  }
  console.log(`\nRepaired ${fixes.length}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
