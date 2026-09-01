// Replaces the Catholic planning checklist PDF and regenerates its card
// thumbnail from the new cover, following the resource-file SOP: the filename
// carries a date, so the file is renamed and next.config.ts redirects the old
// path.
//
//   node scripts/replace-checklist-asset.mjs "<new pdf>" "<page-1 render png>"

import sharp from 'sharp';
import fs from 'node:fs';

const [PDF, COVER] = process.argv.slice(2);
if (!PDF || !COVER || !fs.existsSync(PDF) || !fs.existsSync(COVER)) {
  console.error('Usage: node scripts/replace-checklist-asset.mjs "<new pdf>" "<page-1 render png>"');
  process.exit(1);
}

const NEW_PDF = 'public/documents/checklist-in-person-catholic-8-13-26.pdf';
const NEW_THUMB = 'public/images/checklist-catholic-8-13-26-thumb.png';

fs.copyFileSync(PDF, NEW_PDF);

// Same 309x400 card size the old thumbnail used, so the resources grid is
// unchanged.
await sharp(COVER).resize({ width: 309, height: 400, fit: 'inside' }).png().toFile(NEW_THUMB + '.tmp');
fs.renameSync(NEW_THUMB + '.tmp', NEW_THUMB);

for (const f of [NEW_PDF, NEW_THUMB]) {
  console.log(`  ${f}  ${(fs.statSync(f).size / 1024).toFixed(0)}KB`);
}
