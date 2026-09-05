// Adds the Fall 2026 flyers as position-one resources: the Catholic flyer on
// the Advertising page, the Public flyer on the Public page. Upserts by slug,
// then verifies both actually sort first in their categories.
//
//   npx tsx --env-file=.env.local prisma/add-fall-flyers-2026.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const ROWS = [
  {
    slug: 'fall-flyer-2026',
    title: 'Fall Flyer - 2026',
    description:
      '"Fall in Love with Reading!" — seasonal picks for fall book fairs, with parent sign-up steps and store QR code.',
    thumbnail: '/images/thumb-fall-2026.png',
    fileUrl: '/documents/fall-flyer-catholic-9-5.pdf',
    category: 'Advertising',
    audience: 'Catholic In Person',
    resourceType: 'PDF',
    order: 0,
    featured: true,
    isActive: true,
  },
  {
    slug: 'fall-flyer-public-2026',
    title: 'Public Fall Flyer - 2026',
    description:
      '"Fall in Love with Reading!" — seasonal picks for fall book fairs, with parent sign-up steps and store QR code.',
    thumbnail: '/images/thumb-fall-public-2026.png',
    fileUrl: '/documents/fall-flyer-public-8-27.pdf',
    category: 'Public',
    audience: 'Public In Person',
    resourceType: 'PDF',
    order: 0,
    featured: true,
    isActive: true,
  },
];

async function main() {
  for (const row of ROWS) {
    // Position one means nothing else in the category may sort at or before it.
    const ahead = await prisma.resource.findMany({
      where: { category: row.category, isActive: true, order: { lte: row.order }, NOT: { slug: row.slug } },
      select: { slug: true, order: true },
    });
    console.log(`${row.slug} -> ${row.category} @ order ${row.order}`);
    if (ahead.length) {
      for (const a of ahead) console.log(`   WOULD SIT BEHIND: ${a.slug} (order ${a.order})`);
    } else {
      console.log('   position one confirmed');
    }
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Add --apply.');
    return;
  }

  for (const { slug, ...data } of ROWS) {
    await prisma.resource.upsert({ where: { slug }, update: data, create: { slug, ...data } });
    console.log(`upserted ${slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
