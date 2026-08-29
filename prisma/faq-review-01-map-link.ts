// FAQ review, item 1: "Find a Book Fair Near You!" is a call to action with no
// way to act -- the map is not clickable and the only link goes to the site
// root, so a prospect still has to hunt for the form. Adds a direct link to the
// inquiry form under the map.
//
// Writes the website rows and the knowledge-base row together so the two stay
// matched. The knowledge-base copy had lost the map image and the link when it
// was imported (the import flattened HTML to text), so it is restored here too.
//
//   npx tsx --env-file=.env.local prisma/faq-review-01-map-link.ts          # dry run
//   npx tsx --env-file=.env.local prisma/faq-review-01-map-link.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const FORM_PATH = '/#signup';
const FORM_URL = 'https://www.ignatiusbookfairs.com/#signup';
// Styled inline rather than with a CSS class: this HTML is stored content, and
// it renders in the homepage block, the FAQ page and the chatbot's crawl, none
// of which share a stylesheet.
const CTA =
  `<p style="margin-top:16px;text-align:center;">` +
  `<a href="${FORM_PATH}" style="display:inline-block;background-color:#f29500;color:#ffffff;` +
  `font-family:brother-1816,sans-serif;font-weight:700;text-transform:uppercase;font-size:14px;` +
  `letter-spacing:0.05em;text-decoration:none;padding:12px 32px;border-radius:4px;">` +
  `Fill out the inquiry form</a></p>`;

// Both website versions get the self-hosted map. The Public row pointed at a
// Webflow CDN copy, which is outside our control and would break the answer if
// that hosting ever lapsed.
const MAP_FIGURE =
  '<figure class="w-richtext-figure-type-image w-richtext-align-fullwidth" style="max-width:1537px" data-rt-type="image" data-rt-align="fullwidth" data-rt-max-width="1537px"><div><img src="/images/anim-map.gif" loading="lazy" alt="Map of Ignatius Book Fairs across the United States" width="auto" height="auto"></div></figure>';

const INTRO =
  '<p>Want to host or attend an Ignatius Book Fair? Visit <a href="https://www.ignatiusbookfairs.com" target="_blank"><em>ignatiusbookfairs.com</em></a> to fill out an inquiry form today!</p>';

const ANSWER = `${INTRO}${MAP_FIGURE}${CTA}`;

async function main() {
  const faqs = await prisma.fAQ.findMany({
    where: { question: { contains: 'Find a Book Fair', mode: 'insensitive' }, isActive: true },
  });
  const kb = await prisma.botAnswer.findMany({
    where: { question: { contains: 'Find a Book Fair', mode: 'insensitive' } },
  });

  console.log(`Website rows: ${faqs.length}   Knowledge-base rows: ${kb.length}\n`);
  for (const f of faqs) {
    const had = /#signup/.test(f.answer);
    console.log(`  FAQ #${f.id} (${f.version}) — ${had ? 'already has the form link' : 'adding form link'}`);
  }
  for (const k of kb) {
    const lostImage = !/<img/i.test(k.answer);
    console.log(`  KB  #${k.id} — adding form link${lostImage ? ', restoring the map image lost on import' : ''}`);
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    console.log(`\nAnswer both tables will hold:\n${ANSWER}\n`);
    return;
  }

  for (const f of faqs) {
    await prisma.fAQ.update({ where: { id: f.id }, data: { answer: ANSWER } });
  }
  for (const k of kb) {
    await prisma.botAnswer.update({
      where: { id: k.id },
      data: {
        answer: ANSWER,
        // The chatbot reads this list, and needs an absolute URL: it has no
        // page to resolve "/#signup" against.
        links: [{ label: 'Book fair inquiry form', url: FORM_URL }],
      },
    });
  }

  // Confirm the two sources now agree.
  const after = await prisma.fAQ.findMany({ where: { id: { in: faqs.map((f) => f.id) } } });
  const afterKb = await prisma.botAnswer.findMany({ where: { id: { in: kb.map((k) => k.id) } } });
  const allMatch = [...after, ...afterKb].every((r) => r.answer === ANSWER);
  console.log(`\nUpdated ${faqs.length} website row(s) and ${kb.length} knowledge-base row(s).`);
  console.log(allMatch ? 'Verified: both sources hold identical text.' : 'WARNING: sources still differ.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
