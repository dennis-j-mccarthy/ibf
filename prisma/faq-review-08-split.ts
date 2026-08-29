// Item 8 follow-up: make the minimum-sales answer a true Catholic/Public pair.
//
// The rows were "Public" + "Both", which meant Public-mode visitors matched
// both and saw the question listed twice, while Catholic-mode visitors matched
// only the "Both" row. Retagging the "Both" row as Catholic gives one answer
// per mode and removes the duplicate.
//
//   npx tsx --env-file=.env.local prisma/faq-review-08-split.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const MATCH = 'minimum book fair sales';

const CATHOLIC =
  '<p>We do not have a set minimum for book fair sales, as we carefully select schools and parishes that are ' +
  'the perfect fit for an engaging in-person book fair. You start earning Ave Dollars rewards from your very ' +
  'first sale, and your rewards double once your fair reaches $6,000 in net sales.</p>';

async function main() {
  const faqs = await prisma.fAQ.findMany({
    where: { question: { contains: MATCH, mode: 'insensitive' }, isActive: true },
  });
  const kb = await prisma.botAnswer.findMany({
    where: { question: { contains: MATCH, mode: 'insensitive' } },
  });

  const faqBoth = faqs.filter((f) => f.version === 'Both');
  const kbBoth = kb.filter((k) => k.siteVersion === 'Both');

  console.log('Before:');
  for (const f of faqs) console.log(`  FAQ #${f.id} version=${f.version}`);
  for (const k of kb) console.log(`  KB  #${k.id} mode=${k.siteVersion}`);
  console.log(`\nRetagging as Catholic: ${faqBoth.length} website row(s), ${kbBoth.length} knowledge-base row(s)`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Add --apply.');
    return;
  }

  for (const f of faqBoth) {
    await prisma.fAQ.update({ where: { id: f.id }, data: { version: 'Catholic', answer: CATHOLIC } });
  }
  for (const k of kbBoth) {
    await prisma.botAnswer.update({ where: { id: k.id }, data: { siteVersion: 'Catholic', answer: CATHOLIC } });
  }

  const after = await prisma.fAQ.findMany({ where: { question: { contains: MATCH, mode: 'insensitive' }, isActive: true } });
  const afterKb = await prisma.botAnswer.findMany({ where: { question: { contains: MATCH, mode: 'insensitive' } } });
  console.log('\nAfter:');
  for (const f of after) console.log(`  FAQ #${f.id} version=${f.version}`);
  for (const k of afterKb) console.log(`  KB  #${k.id} mode=${k.siteVersion}`);

  const cath = after.filter((f) => f.version === 'Catholic' || f.version === 'Both').length;
  const pub = after.filter((f) => f.version === 'Public' || f.version === 'Both').length;
  console.log(`\nCatholic visitors now see ${cath}; Public visitors now see ${pub}. (1 each is correct.)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
