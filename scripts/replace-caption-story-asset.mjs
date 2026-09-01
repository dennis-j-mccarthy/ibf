// Replaces the artwork behind the "You Caption It: Social Media Story" resource
// (slug you-caption-it-social-media-story) with a new file, writing over the
// existing paths so any link already sent out serves the new image.
//
//   node scripts/replace-caption-story-asset.mjs "<path to new image>"

import sharp from 'sharp';
import fs from 'node:fs';

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error('Usage: node scripts/replace-caption-story-asset.mjs "<path to new image>"');
  process.exit(1);
}

const FILE = 'public/documents/DigitalPackage-SocialStory-04.jpg';
const THUMB = 'public/images/you-caption-it-story-thumb.png';

const before = await sharp(FILE).metadata();
console.log(`current artwork: ${before.width}x${before.height} ${before.format}`);

// The download itself keeps its .jpg path, so it must stay a real JPEG.
await sharp(SRC).jpeg({ quality: 88 }).toFile(FILE + '.tmp');
fs.renameSync(FILE + '.tmp', FILE);

// The card thumbnail has to be regenerated too, or the resources page shows the
// old design next to a download of the new one.
await sharp(SRC).resize({ width: 400 }).png().toFile(THUMB + '.tmp');
fs.renameSync(THUMB + '.tmp', THUMB);

for (const f of [FILE, THUMB]) {
  const m = await sharp(f).metadata();
  console.log(`  ${f}  ${m.width}x${m.height} ${m.format}  ${(fs.statSync(f).size / 1024).toFixed(0)}KB`);
}
