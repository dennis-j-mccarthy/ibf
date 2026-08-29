// Applies approved edits from the "Proposed changes to website FAQs" review.
// Each edit writes the website row(s) and the knowledge-base row(s) together
// and verifies they match, so the two sources cannot drift apart.
//
//   npx tsx --env-file=.env.local prisma/faq-review-edits.ts --item 11
//   npx tsx --env-file=.env.local prisma/faq-review-edits.ts --item 11 --apply
//
// Items 1 and 10 shipped as their own scripts (each needed extra repair work).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const ITEM = process.argv[process.argv.indexOf('--item') + 1];

type Edit = {
  item: string;
  note: string;
  match: string;
  // One answer for everyone, or a different answer per mode.
  answer?: string;
  byVersion?: { Catholic: string; Public: string };
};

const EDITS: Edit[] = [
  {
    item: '6',
    note: '"full-service" read as "they send staff"; reviewer\'s wording, verbatim',
    match: 'book fairs in-person',
    answer:
      '<p>Yes! We are thrilled to offer the books and materials to create your own in-person book fair experience ' +
      'that will bring the joy of reading to your community. We also offer virtual book fairs.</p>',
  },
  {
    item: '3',
    note: 'link the inquiry form, you -> we, school -> organization; Catholic rows had no link at all',
    match: 'Where can a',
    byVersion: {
      Catholic:
        '<p>Ignatius Book Fairs are now available for schools and parishes across the continental United States! ' +
        'If you are interested in hosting a book fair, please <a href="/#signup">fill out an inquiry form</a> and ' +
        'tell us more about your organization. Book your appointment with one of our dedicated Book Fair Pros. ' +
        'Together, we can determine if your organization is a fit for this incredible opportunity.</p>',
      Public:
        '<p>Ignatius Book Fairs are now available for schools and organizations across the continental United States! ' +
        'If you are interested in hosting a book fair, please <a href="/#signup">fill out an inquiry form</a> and ' +
        'tell us more about your organization. Book your appointment with one of our dedicated Book Fair Pros. ' +
        'Together, we can determine if your organization is a fit for this incredible opportunity.</p>',
    },
  },
  {
    item: '2',
    note: 'the inquiry-form link pointed at the site root, so it landed nowhere useful',
    match: 'process if I want to host',
    answer:
      '<p>To host a book fair, please <a href="/#signup">complete an inquiry form</a>. You will be directed to a ' +
      'Book Fair Pro appointment form so we can provide more information and answer any questions you have.</p>',
  },
  {
    item: '4',
    note: '"experience in Catholic schools" excluded public and charter schools',
    match: 'Who is on your team',
    answer:
      '<p>Our Ignatius Book Fairs team is truly exceptional! Guided by seasoned experts from Ave Maria University ' +
      'and Ignatius Press, our Operations Team comprises individuals with vast experience in schools of every kind ' +
      'and in book fairs. Additionally, we have enthusiastic student interns from Ave Maria University lending ' +
      'their support. We cannot wait to connect with you!</p>',
  },
  {
    item: '8',
    note: 'rewards start at the first sale and double at $6,000; school -> organization',
    match: 'minimum book fair sales',
    byVersion: {
      Catholic:
        '<p>We do not have a set minimum for book fair sales, as we carefully select schools and parishes that are ' +
        'the perfect fit for an engaging in-person book fair. You start earning Ave Dollars rewards from your very ' +
        'first sale, and your rewards double once your fair reaches $6,000 in net sales.</p>',
      Public:
        '<p>We do not have a set minimum for book fair sales, as we carefully select organizations that are the ' +
        'perfect fit for an engaging in-person book fair. You start earning Ave Dollars rewards from your very ' +
        'first sale, and your rewards double once your fair reaches $6,000 in net sales.</p>',
    },
  },
  {
    item: '5',
    note: 'three seasons in, he is no longer being unveiled',
    match: 'mascot',
    answer:
      '<p>Yes! Loupio is our mascot &mdash; the beloved protagonist of the widely acclaimed comic book series ' +
      '<em>The Adventures of Loupio</em>. He has been part of our fairs since the beginning, and you will spot him ' +
      'on our website, on social media, and at book fairs across the country.</p>',
  },
  {
    item: '12',
    note: 'the "Older Teens 16+ and Adults" table no longer exists',
    match: 'ages does the book fair',
    answer:
      '<p>The Ignatius Book Fair provides books for children in grades K&ndash;8, including picture books, ' +
      'comic books, early readers, and elementary and middle school books.</p>',
  },
  {
    item: '13',
    note: 'customization happens ~90 days out; the "60" was wrong',
    match: 'many books do you send',
    answer:
      '<p>The number of titles your fair receives will be based on a number of factors such as organization size, ' +
      'previous sales, and your preferences. Our book fair pros will help you with this. All organizations will be ' +
      'given the opportunity to make adjustments during our customization process, which happens approximately ' +
      '90 days before your fair begins.</p>',
  },
  {
    item: '14',
    note: "reviewer's wording: Ave Dollars are usable immediately after the fair closes",
    match: 'redeem your Ave Dollars',
    answer:
      '<p>Ave Dollars earned during your fair can be used right away &mdash; spend them on any of the remaining ' +
      'inventory as soon as your fair closes. Any balance left over can be redeemed on our website.</p>',
  },
  {
    item: '15',
    note: 'removes a promise of link-sharing, which the e-Wallet does not do',
    match: 'e-Wallet',
    answer:
      '<p>When this feature is available, all you have to do is find your school&rsquo;s book fair to sign up and add funds. ' +
      'The remaining balance after the fair will become a gift card to shop online with Ignatius Book Fairs.</p>',
  },
  {
    item: '11',
    note: '"hundreds" understated the catalog; also switches school -> organization',
    match: 'shop for additional books',
    answer:
      '<p>Yes, our website offers an extensive collection of over 1,000 additional titles, with new books added regularly. ' +
      'All of them are available with free shipping to your organization during our book fairs, and your organization earns Ave Dollars on every online purchase.</p>',
  },
];

const isCatholic = (v: string) => v === 'Catholic' || (v !== 'Public' && v.includes('Catholic'));

async function main() {
  const edits = ITEM ? EDITS.filter((e) => e.item === ITEM) : EDITS;
  if (!edits.length) {
    console.log(`No edit defined for item ${ITEM}. Known: ${EDITS.map((e) => e.item).join(', ')}`);
    return;
  }

  for (const e of edits) {
    console.log(`\n=== Item ${e.item} — ${e.note}`);
    const faqs = await prisma.fAQ.findMany({
      where: { question: { contains: e.match, mode: 'insensitive' }, isActive: true },
    });
    const kb = await prisma.botAnswer.findMany({
      where: { question: { contains: e.match, mode: 'insensitive' } },
    });

    const answerFor = (version: string | null) => {
      if (e.answer) return e.answer;
      const v = version ?? 'Both';
      // A row serving both modes gets the Catholic text only if it is the sole
      // row; otherwise each mode's row gets its own.
      return isCatholic(v) ? e.byVersion!.Catholic : e.byVersion!.Public;
    };

    for (const f of faqs) console.log(`   FAQ #${f.id} (${f.version}, ${f.pageTitle})`);
    for (const k of kb) console.log(`   KB  #${k.id} (${k.siteVersion ?? 'no mode'})`);

    if (!APPLY) {
      console.log(`\n   Would write:\n   ${answerFor('Catholic').slice(0, 300)}`);
      continue;
    }

    for (const f of faqs) {
      await prisma.fAQ.update({ where: { id: f.id }, data: { answer: answerFor(f.version) } });
    }
    for (const k of kb) {
      await prisma.botAnswer.update({ where: { id: k.id }, data: { answer: answerFor(k.siteVersion) } });
    }

    // Verify: every website row and its knowledge-base counterpart agree.
    const afterFaq = await prisma.fAQ.findMany({ where: { id: { in: faqs.map((f) => f.id) } } });
    const afterKb = await prisma.botAnswer.findMany({ where: { id: { in: kb.map((k) => k.id) } } });
    const bad = [...afterFaq, ...afterKb].filter((r) => {
      const v = 'version' in r ? r.version : (r.siteVersion ?? 'Both');
      return r.answer !== answerFor(v);
    });
    console.log(
      `   Updated ${faqs.length} website row(s), ${kb.length} knowledge-base row(s). ` +
        (bad.length ? `WARNING: ${bad.length} row(s) did not match.` : 'Verified: both sources match.')
    );
  }

  if (!APPLY) console.log('\nDRY RUN — nothing written. Add --apply.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
