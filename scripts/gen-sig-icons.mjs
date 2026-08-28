// Generates the email-signature social icons: 64x64 rounded-square PNGs,
// one set per brand accent (default blue + "-battle" maroon variants).
// Run from the repo root: node scripts/gen-sig-icons.mjs
import sharp from 'sharp';

const SETS = [
  { suffix: '', bg: '#0088ff' }, // Ignatius Book Fairs
  { suffix: '-battle', bg: '#02176f' }, // Ignatius Book Battle
];

const base = (bg, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bg}"/>
  ${inner}
</svg>`;

// Glyph paths from Font Awesome free brand icons (CC BY 4.0), scaled to fit.
const GLYPHS = {
  facebook: `<g transform="translate(21.5,14) scale(0.0703)">
      <path fill="#fff" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/>
    </g>`,
  instagram: `<g fill="none" stroke="#fff" stroke-width="4">
      <rect x="16" y="16" width="32" height="32" rx="9"/>
      <circle cx="32" cy="32" r="7.5"/>
    </g>
    <circle cx="41.5" cy="22.5" r="2.6" fill="#fff"/>`,
  linkedin: `<g transform="translate(16.5,14) scale(0.0703)">
      <path fill="#fff" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 155.6z"/>
    </g>`,
};

for (const { suffix, bg } of SETS) {
  const [br, bgc, bb] = [parseInt(bg.slice(1, 3), 16), parseInt(bg.slice(3, 5), 16), parseInt(bg.slice(5, 7), 16)];
  for (const [name, glyph] of Object.entries(GLYPHS)) {
    const out = `public/images/sig-${name}${suffix}.png`;
    await sharp(Buffer.from(base(bg, glyph))).png().toFile(out);
    // pixel audit: confirm the glyph rendered and the background is the accent
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    let white = 0, accent = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], info.channels > 3 ? data[i + 3] : 255];
      if (a > 200 && r > 230 && g > 230 && b > 230) white++;
      if (a > 200 && Math.abs(r - br) < 12 && Math.abs(g - bgc) < 12 && Math.abs(b - bb) < 12) accent++;
    }
    console.log(`${out}: ${info.width}x${info.height}, glyph px=${white}, accent px=${accent}`);
    if (white < 100 || accent < 2000) throw new Error(`${out} failed pixel audit`);
  }
}
