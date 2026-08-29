// FAQ review, item 10: the words "online store" in "Can I see the list of
// books...?" linked to a Microsoft Word editor session on a staff member's
// personal SharePoint. It was broken for every visitor and exposed her email
// address and an internal document path in a public page. Repointed to the
// storefront used by the header, footer and About page.
//
// Also promotes the faith-based/secular sentence to the front of the answer:
// the reviewer's concern was that secular schools bounce before reaching it.
//
//   npx tsx --env-file=.env.local prisma/faq-review-10-store-link.ts          # dry run
//   npx tsx --env-file=.env.local prisma/faq-review-10-store-link.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const STORE = 'https://shop.ignatiusbookfairs.com/';

const ANSWER =
  '<p>Our fairs feature a curated selection of both faith-based and wholesome, secular books, carefully chosen to align with the values of the communities we serve.</p>' +
  '<p>Our full book fair list is proprietary, but we&rsquo;re happy to share a customized preview with schools and organizations after learning more about your goals and needs. ' +
  `In the meantime, you're welcome to browse our <a href="${STORE}" target="_blank" rel="noopener">online store</a> to get a sense of our high-quality titles.</p>`;

const MATCH = 'list of books that is sent';

async function main() {
  const faqs = await prisma.fAQ.findMany({
    where: { question: { contains: MATCH, mode: 'insensitive' }, isActive: true },
  });
  const kb = await prisma.botAnswer.findMany({
    where: { question: { contains: MATCH, mode: 'insensitive' } },
  });

  for (const f of faqs) {
    const leak = /officeapps\.live\.com|sharepoint/i.test(f.answer);
    console.log(`  FAQ #${f.id} (${f.version})${leak ? '  <- contains the SharePoint link' : ''}`);
  }
  for (const k of kb) console.log(`  KB  #${k.id}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    return;
  }

  for (const f of faqs) await prisma.fAQ.update({ where: { id: f.id }, data: { answer: ANSWER } });
  for (const k of kb) {
    await prisma.botAnswer.update({
      where: { id: k.id },
      data: { answer: ANSWER, links: [{ label: 'Ignatius Book Fairs online store', url: STORE }] },
    });
  }

  const leftovers = await prisma.fAQ.count({
    where: { OR: [{ answer: { contains: 'officeapps.live.com' } }, { answer: { contains: 'sharepoint' } }] },
  });
  const leftoversKb = await prisma.botAnswer.count({
    where: { OR: [{ answer: { contains: 'officeapps.live.com' } }, { answer: { contains: 'sharepoint' } }] },
  });
  console.log(`\nUpdated ${faqs.length} website row(s) and ${kb.length} knowledge-base row(s).`);
  console.log(`Rows anywhere still holding a SharePoint link: ${leftovers + leftoversKb}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
