/**
 * Enriches a book list CSV with data from ISBNdb API + Open Library fallback.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/enrich-books.ts <input.csv> [output.csv]
 *
 * Adds columns: Authors, PageCount, Description, ImageURL, Dimensions, Binding, Publisher_Lookup
 */

import * as fs from 'fs';

const ISBNDB_KEY = '50975_d764aeecaa9b6c3b9ab910cad00d0c26';
const INPUT = process.argv[2];
const OUTPUT = process.argv[3] || INPUT.replace('.csv', '-enriched.csv');

if (!INPUT) {
  console.error('Usage: npx ts-node scripts/enrich-books.ts <input.csv> [output.csv]');
  process.exit(1);
}

interface BookData {
  authors: string;
  pageCount: string;
  description: string;
  imageUrl: string;
  dimensions: string;
  binding: string;
  publisher: string;
}

async function fetchISBNdb(isbn: string): Promise<Partial<BookData>> {
  try {
    const res = await fetch(`https://api2.isbndb.com/book/${isbn}`, {
      headers: { 'Authorization': ISBNDB_KEY },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const book = data.book;
    if (!book) return {};
    return {
      authors: (book.authors || []).join('; '),
      pageCount: book.pages?.toString() || '',
      description: book.synopsis || book.overview || '',
      imageUrl: book.image || '',
      dimensions: book.dimensions || '',
      binding: book.binding || '',
      publisher: book.publisher || '',
    };
  } catch {
    return {};
  }
}

async function fetchOpenLibraryByISBN(isbn: string): Promise<Partial<BookData>> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) return {};
    const ed = await res.json();
    const result: Partial<BookData> = {};
    if (ed.number_of_pages) result.pageCount = ed.number_of_pages.toString();
    if (ed.physical_dimensions) result.dimensions = ed.physical_dimensions;
    if (ed.description) {
      result.description = typeof ed.description === 'string' ? ed.description : ed.description.value || '';
    }
    // Try work for description
    if (!result.description && ed.works && ed.works.length > 0) {
      const wRes = await fetch(`https://openlibrary.org${ed.works[0].key}.json`);
      if (wRes.ok) {
        const work = await wRes.json();
        if (work.description) {
          result.description = typeof work.description === 'string' ? work.description : work.description.value || '';
        }
      }
    }
    result.imageUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    return result;
  } catch {
    return {};
  }
}

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.length > 1000) val = val.substring(0, 997) + '...';
  // Strip HTML tags
  val = val.replace(/<[^>]+>/g, '');
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
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  const raw = fs.readFileSync(INPUT, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());
  const header = lines[0];
  const headerFields = parseCSVLine(header);

  const mpnIndex = headerFields.findIndex(h => h.trim().toLowerCase() === 'mpn');
  if (mpnIndex === -1) {
    console.error('Could not find MPN column in CSV header');
    process.exit(1);
  }

  const enrichedHeader = header + ',Authors,PageCount,Description,ImageURL,Dimensions,Binding,Publisher_Lookup';
  const outputLines = [enrichedHeader];

  const dataRows = lines.slice(1).filter(l => {
    const fields = parseCSVLine(l);
    return fields[mpnIndex]?.trim().length > 0;
  });

  console.log(`Processing ${dataRows.length} books via ISBNdb + Open Library...\n`);

  let descFound = 0;
  let imgFound = 0;
  let dimFound = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const line = dataRows[i];
    const fields = parseCSVLine(line);
    const isbn = fields[mpnIndex]?.trim();
    const title = fields[4]?.trim() || 'Unknown';

    process.stdout.write(`[${i + 1}/${dataRows.length}] ${title.substring(0, 50).padEnd(50)}  `);

    // ISBNdb first (best coverage)
    const isbndb = await fetchISBNdb(isbn);

    // Open Library fallback for missing fields
    let ol: Partial<BookData> = {};
    if (!isbndb.description || !isbndb.dimensions) {
      ol = await fetchOpenLibraryByISBN(isbn);
    }

    const merged: BookData = {
      authors: isbndb.authors || ol.authors || '',
      pageCount: isbndb.pageCount || ol.pageCount || '',
      description: isbndb.description || ol.description || '',
      imageUrl: isbndb.imageUrl || ol.imageUrl || '',
      dimensions: isbndb.dimensions || ol.dimensions || '',
      binding: isbndb.binding || '',
      publisher: isbndb.publisher || '',
    };

    if (merged.description) descFound++;
    if (merged.imageUrl) imgFound++;
    if (merged.dimensions) dimFound++;

    const enrichedLine = line + ',' +
      escapeCSV(merged.authors) + ',' +
      escapeCSV(merged.pageCount) + ',' +
      escapeCSV(merged.description) + ',' +
      escapeCSV(merged.imageUrl) + ',' +
      escapeCSV(merged.dimensions) + ',' +
      escapeCSV(merged.binding) + ',' +
      escapeCSV(merged.publisher);

    outputLines.push(enrichedLine);

    const status = [
      merged.description ? 'desc' : '',
      merged.imageUrl ? 'img' : '',
      merged.dimensions ? 'dim' : '',
    ].filter(Boolean).join('+') || 'NONE';
    console.log(status);

    // Rate limit for ISBNdb (1 req/sec on basic plan)
    await new Promise(r => setTimeout(r, 500));
  }

  fs.writeFileSync(OUTPUT, outputLines.join('\n'), 'utf-8');
  console.log(`\n--- Summary ---`);
  console.log(`Descriptions: ${descFound}/${dataRows.length}`);
  console.log(`Images:       ${imgFound}/${dataRows.length}`);
  console.log(`Dimensions:   ${dimFound}/${dataRows.length}`);
  console.log(`\nSaved to: ${OUTPUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
