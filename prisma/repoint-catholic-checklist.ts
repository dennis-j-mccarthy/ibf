// Points the Catholic planning checklist at its renamed file and thumbnail.
// The 3-17 names were stale once the 8-13-26 revision landed; next.config.ts
// redirects the old PDF path.
//
//   npx tsx --env-file=.env.local prisma/repoint-catholic-checklist.ts --apply

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

const OLD_FILE = '/documents/checklist-in-person-catholic-3-17.pdf';
const NEW_FILE = '/documents/checklist-in-person-catholic-8-13-26.pdf';
const OLD_THUMB = '/images/checklist-catholic-3-17-thumb.png';
const NEW_THUMB = '/images/checklist-catholic-8-13-26-thumb.png';

async function main() {
  const rows = await prisma.resource.findMany({
    where: { OR: [{ fileUrl: OLD_FILE }, { thumbnail: OLD_THUMB }] },
  });
  console.log(`Rows on the old names: ${rows.length}`);
  for (const r of rows) console.log(`  #${r.id}  ${r.title}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Add --apply.');
    return;
  }

  const f = await prisma.resource.updateMany({ where: { fileUrl: OLD_FILE }, data: { fileUrl: NEW_FILE } });
  const t = await prisma.resource.updateMany({ where: { thumbnail: OLD_THUMB }, data: { thumbnail: NEW_THUMB } });
  const left = await prisma.resource.count({
    where: { OR: [{ fileUrl: OLD_FILE }, { thumbnail: OLD_THUMB }] },
  });
  console.log(`\nUpdated ${f.count} file path(s), ${t.count} thumbnail(s). Still on old names: ${left}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
