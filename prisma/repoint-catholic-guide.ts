// Points the Catholic in-person operational guide at its renamed file.
// The old name carried a Webflow hash and a January date long after the August
// revision replaced the contents; next.config.ts redirects the old path.
//
//   npx tsx --env-file=.env.local prisma/repoint-catholic-guide.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const OLD = '/documents/6972c6f5a779558d8d96668a_in-person-guide-catholic-1-22-26.pdf';
const NEW = '/documents/in-person-guide-catholic-8-31-26.pdf';

async function main() {
  // Any resource pointing at the old file, not just the guide itself.
  const rows = await prisma.resource.findMany({ where: { fileUrl: OLD } });
  console.log(`Resources pointing at the old filename: ${rows.length}`);
  for (const r of rows) console.log(`  #${r.id}  ${r.title}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Add --apply.');
    return;
  }

  const res = await prisma.resource.updateMany({ where: { fileUrl: OLD }, data: { fileUrl: NEW } });
  const left = await prisma.resource.count({ where: { fileUrl: OLD } });
  console.log(`\nUpdated ${res.count}. Still on the old filename: ${left}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
