/**
 * Patches the enriched CSV with manually scraped data for missing books.
 */
import * as fs from 'fs';

const FILE = '/Users/dennis.mccarthy/Downloads/Book-List-C-enriched.csv';

// Manual data for books that ISBNdb/Open Library missed
const patches: Record<string, { authors: string; pageCount: string; description: string; imageUrl: string; dimensions: string }> = {
  '9798999577054': {
    authors: 'Voyage Comics',
    pageCount: '',
    description: 'After having successfully defended his family from Gustave\'s goons, Max prepares for what he hopes will be a final showdown between him and his former boss. However, upon returning to Milwaukee he encounters instead a trio of ruthless robots that are programmed to kill. Max fights for his life as he battles against evil spawn from his original creation. Will he be able to defeat these malevolent machinations?',
    imageUrl: 'https://shop.voyagecomics.com/cdn/shop/files/MedalKnight_3_print_Cover-TEMP_1R.jpg?v=1763129293',
    dimensions: '',
  },
  '9798999577030': {
    authors: 'Augustine Institute; Voyage Comics',
    pageCount: '',
    description: 'This historical graphic novel traces the life of St. Edith Stein from her childhood through her martyrdom in a Nazi gas chamber during World War II. Born into a Jewish family, Stein possessed an innate hunger for the truth at a young age and eventually converted to Catholicism, becoming a faithful student of the Cross.',
    imageUrl: '',
    dimensions: '',
  },
  '9798989547470': {
    authors: 'OLV Charities; Voyage Comics',
    pageCount: '',
    description: 'An action-packed, full-color comic book biography that brings to life the inspiring story of Father Nelson Baker. The narrative follows his conversion to Catholicism at age 9, his initial success as a businessman, and his eventual calling to serve Buffalo\'s poor and disadvantaged youth. Baker founded OLV Charities and became known as a father to the fatherless.',
    imageUrl: '',
    dimensions: '',
  },
  '9781621648772': {
    authors: 'Nick Meylaender; Albert Carreres',
    pageCount: '208',
    description: 'A dynamic saint for the digital age inspires children to become holy. Carlo Acutis enjoyed typical teenage activities like soccer, video games, and computers, but distinguished himself through deep faith. He attended daily Mass, prayed the Rosary, and used his tech skills to create a website sharing Eucharistic miracles worldwide. This manga presents his true story as an inspiration for teens to live boldly for God.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/c/a/carlo_acutis_manga-couv_1er.png',
    dimensions: '5.75 x 8.25 inches',
  },
  '9781621648482': {
    authors: 'Karine-Marie Amiot; Diane de Saint-Exupery',
    pageCount: '32',
    description: 'As our family grows, so does the love we share. Mother Bunny\'s expanding belly prompts young Henry to worry about his place in her heart, but he discovers how a new sibling brings joy to the entire family.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/o/u/our_family_is_growing_couv_web-withalpha.png',
    dimensions: '8.25 x 8.25 inches',
  },
  '9781621648512': {
    authors: 'Judith Bouilloc; Sarah Ugolotti',
    pageCount: '72',
    description: 'A boy encounters Saint Francis of Assisi, and the two embark on a treasure hunt. What is true treasure, and where is it to be found? These are the questions posed by this story and answered with the simple wisdom of Saint Francis.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/t/h/the-treasure-of-creation_couv-web.png',
    dimensions: '7.25 x 10.25 inches',
  },
  '9781621648543': {
    authors: 'Sophie de Mullenheim',
    pageCount: '304',
    description: 'Set in 1985, the narrative follows Rafael discovering a mysterious gold-lettered book in a landfill -- a perfect birthday gift for his older brother, Pablo. This discovery triggers a series of miraculous events involving a French volunteer named Claire during the horrific Mexico City earthquake. The Gypsy Book contains wisdom and moral guidance that appears at pivotal moments in history.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/c/o/couv-when_the_earth_shook-webwithalpha.png',
    dimensions: '5.5 x 8.25 inches',
  },
  '9781621648918': {
    authors: 'Matt Yokum; Jordan Holt',
    pageCount: '116',
    description: 'This graphic-style biography chronicles Shahbaz Bhatti\'s extraordinary life (1968-2011). The work weaves powerful artwork with Gospel episodes that mirrored his life and martyrdom in Pakistan, presenting an unforgettable portrait of a servant-leader who refused to be silent in the face of injustice.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/b/l/blood-and-water_couv.png',
    dimensions: '',
  },
  '9781621648901': {
    authors: 'Thereza Ameal; Izaac Brito',
    pageCount: '32',
    description: 'From the moment Robert Prevost was born into a loving, faith-filled family, God was guiding him toward an extraordinary calling: to become Pope Leo XIV. Told through the eyes of his guardian angel, this is a joyful and inspiring story that examines the childhood and foundational faith of a future pontiff.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/l/e/leo_xiv_the_pope_from_both_americas.png',
    dimensions: '8.5 x 9.5 inches',
  },
  '9781621648307': {
    authors: 'Alexandra Garibal; Bergamote Trottemenu',
    pageCount: '32',
    description: 'An interactive Bible is a great way to introduce toddlers to the story of God\'s action in his creation. Eight biblical stories through interactive elements including a wheel to slide and flaps to lift, allowing children to watch scenes unfold depicting events like God creating the world, Moses leading God\'s people, and Jesus rising from the dead.',
    imageUrl: 'https://media.magnificat.net/magento-media/media/catalog/product/cache/eddcaedb9de7b7ccdbfb963779d3c2e4/m/y/my_first_interactive_bible_couv.png',
    dimensions: '8.75 x 9.75 inches',
  },
};

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return '"' + val.replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
  }
  return val;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { fields.push(current); current = ''; }
      else { current += ch; }
    }
  }
  fields.push(current);
  return fields;
}

const raw = fs.readFileSync(FILE, 'utf-8');
const lines = raw.split('\n');
const header = lines[0];
const headerFields = parseCSVLine(header);
const mpnIndex = headerFields.findIndex(h => h.trim().toLowerCase() === 'mpn');
// Enriched columns start after the original columns
// Header: ...,Authors,PageCount,Description,ImageURL,Dimensions,Binding,Publisher_Lookup
const authorsIdx = headerFields.length - 7;
const pageCountIdx = headerFields.length - 6;
const descIdx = headerFields.length - 5;
const imageIdx = headerFields.length - 4;
const dimIdx = headerFields.length - 3;

let patched = 0;
const outputLines = [header];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const fields = parseCSVLine(lines[i]);
  const isbn = fields[mpnIndex]?.trim();

  if (isbn && patches[isbn]) {
    const p = patches[isbn];
    // Only patch empty fields
    if (!fields[authorsIdx]?.trim() && p.authors) fields[authorsIdx] = p.authors;
    if (!fields[pageCountIdx]?.trim() && p.pageCount) fields[pageCountIdx] = p.pageCount;
    if (!fields[descIdx]?.trim() && p.description) fields[descIdx] = p.description;
    if (!fields[imageIdx]?.trim() && p.imageUrl) fields[imageIdx] = p.imageUrl;
    if (!fields[dimIdx]?.trim() && p.dimensions) fields[dimIdx] = p.dimensions;
    patched++;
    console.log(`Patched: ${fields[4]?.trim()}`);
  }

  outputLines.push(fields.map(f => escapeCSV(f)).join(','));
}

fs.writeFileSync(FILE, outputLines.join('\n'), 'utf-8');
console.log(`\nPatched ${patched} books. Saved to ${FILE}`);
