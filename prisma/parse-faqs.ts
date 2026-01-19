import * as fs from 'fs';
import * as path from 'path';

interface FaqEntry {
  question: string;
  answer: string;
  pageTitle: string;
  order: number | null;
  version: string;
}

// Read and parse the CSV
const csvPath = path.join(__dirname, 'faqs.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV properly handling quoted fields with commas and newlines
function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // Row separator
        currentRow.push(currentField);
        if (currentRow.length > 1 || currentRow[0] !== '') {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        if (char === '\r') i++; // Skip \n after \r
      } else {
        currentField += char;
      }
    }
  }
  
  // Don't forget the last field/row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  
  return rows;
}

const rows = parseCSV(csvContent);
const headers = rows[0];
const dataRows = rows.slice(1);

// Find column indices
const nameIdx = headers.indexOf('Name');
const answerIdx = headers.indexOf('Answer');
const pageTitleIdx = headers.indexOf('Page Title');
const orderIdx = headers.indexOf('Order');
const versionIdx = headers.indexOf('Version');
const draftIdx = headers.indexOf('Draft');

console.log('Headers:', headers);
console.log(`Found ${dataRows.length} FAQ rows`);

// Parse FAQs - deduplicate by question and version
const faqMap = new Map<string, FaqEntry>();

for (const row of dataRows) {
  const draft = row[draftIdx]?.trim().toLowerCase();
  if (draft === 'true') continue; // Skip drafts
  
  const question = row[nameIdx]?.trim();
  const answer = row[answerIdx]?.trim();
  const pageTitle = row[pageTitleIdx]?.trim() || '';
  const orderStr = row[orderIdx]?.trim();
  const version = row[versionIdx]?.trim() || 'Public';
  
  if (!question || !answer) continue;
  
  // Clean up HTML answer - remove empty paragraphs
  const cleanAnswer = answer
    .replace(/<p id="">\s*‍?\s*<\/p>/g, '')
    .replace(/\s+id="[^"]*"/g, '')
    .trim();
  
  const order = orderStr ? parseInt(orderStr) : null;
  
  // Create unique key based on question and version
  const key = `${question.toLowerCase()}|${version}`;
  
  // If we don't have this FAQ yet, or this one has a lower order (higher priority)
  if (!faqMap.has(key) || (order !== null && (faqMap.get(key)!.order === null || order < faqMap.get(key)!.order!))) {
    faqMap.set(key, {
      question,
      answer: cleanAnswer,
      pageTitle,
      order,
      version
    });
  }
}

// Convert to array and sort
const faqs = Array.from(faqMap.values()).sort((a, b) => {
  // Sort by version first (Public before Catholic), then by order
  if (a.version !== b.version) {
    return a.version === 'Public' ? -1 : 1;
  }
  if (a.order !== null && b.order !== null) {
    return a.order - b.order;
  }
  if (a.order !== null) return -1;
  if (b.order !== null) return 1;
  return 0;
});

// Group by page title for better organization
const groupedByPage = new Map<string, FaqEntry[]>();
for (const faq of faqs) {
  const page = faq.pageTitle || 'General';
  if (!groupedByPage.has(page)) {
    groupedByPage.set(page, []);
  }
  groupedByPage.get(page)!.push(faq);
}

console.log('\nFAQs by category:');
for (const [page, pageFaqs] of groupedByPage) {
  console.log(`  ${page}: ${pageFaqs.length}`);
}

// Generate TypeScript output for seed.ts
const output = `// Auto-generated from faqs.csv
export const faqsFromCSV = ${JSON.stringify(faqs, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, 'faqs-parsed.ts'), output);
console.log(`\nWritten ${faqs.length} unique FAQs to faqs-parsed.ts`);
