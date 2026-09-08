// Points the Category Signs resource at the 9-8-26 revision (crop marks
// trimmed to the TrimBox). next.config.ts redirects the old path.
//
//   npx tsx --env-file=.env.local prisma/repoint-category-signs.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const NEW_FILE = '/documents/category-signs-9-8-26.pdf';
const NEW_THUMB = '/images/category-signs-9-8-26-thumb.png';

async function main() {
  const row = await prisma.resource.findUnique({ where: { slug: 'category-signs' } });
  if (!row) {
    console.log('category-signs resource not found');
    return;
  }
  console.log(`#${row.id}  ${row.title}`);
  console.log(`   file: ${row.fileUrl}  ->  ${NEW_FILE}`);
  console.log(`   thumb: ${row.thumbnail}  ->  ${NEW_THUMB}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Add --apply.');
    return;
  }
  await prisma.resource.update({
    where: { slug: 'category-signs' },
    data: { fileUrl: NEW_FILE, thumbnail: NEW_THUMB },
  });
  console.log('updated');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
