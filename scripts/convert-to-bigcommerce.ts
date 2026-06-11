/**
 * Converts enriched book list CSV to BigCommerce product import format.
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/convert-to-bigcommerce.ts
 */

import * as fs from 'fs';

const INPUT = '/Users/dennis.mccarthy/Downloads/Book-List-C-enriched.csv';
const OUTPUT = '/Users/dennis.mccarthy/Downloads/Book-List-C-bigcommerce.csv';

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

function escapeCSV(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return '"' + val.replace(/"/g, '""').replace(/[\r\n]+/g, ' ') + '"';
  }
  return val;
}

// Parse dimensions string like "Height: 7.62 Inches, Length: 5.12 Inches, Weight: 0.2 Pounds, Width: 0.26 inches"
// or "5.75 x 8.25 inches" or "7.25 x 10.25 inches"
function parseDimensions(dim: string): { weight: string; width: string; height: string; depth: string } {
  const result = { weight: '', width: '', height: '', depth: '' };
  if (!dim) return result;

  // Format: "H x W inches"
  const simpleMatch = dim.match(/^([\d.]+)\s*x\s*([\d.]+)\s*(?:x\s*([\d.]+)\s*)?in/i);
  if (simpleMatch) {
    result.width = simpleMatch[1];
    result.height = simpleMatch[2];
    if (simpleMatch[3]) result.depth = simpleMatch[3];
    return result;
  }

  // Format: "Height: X Inches, Length: Y Inches, Weight: Z Pounds, Width: W inches"
  const heightMatch = dim.match(/Height:\s*([\d.]+)/i);
  const lengthMatch = dim.match(/Length:\s*([\d.]+)/i);
  const weightMatch = dim.match(/Weight:\s*([\d.]+)/i);
  const widthMatch = dim.match(/Width:\s*([\d.]+)/i);

  if (heightMatch) result.height = heightMatch[1];
  if (lengthMatch) result.depth = lengthMatch[1]; // Length = Depth in BC
  if (weightMatch) result.weight = weightMatch[1];
  if (widthMatch) result.width = widthMatch[1];

  return result;
}

// Map source category to BigCommerce category path
function mapCategory(category: string, listClass: string): string {
  // Keep the original category, prepend with list class if needed
  const cats: string[] = [];
  if (category) cats.push(category);
  if (listClass) cats.push(listClass);
  return cats.join(';');
}

const raw = fs.readFileSync(INPUT, 'utf-8');
const lines = raw.split('\n').filter(l => l.trim());
const headerFields = parseCSVLine(lines[0]);

// Source column indices (from the enriched CSV)
// Cols: 0=IBC Code, 1=Star, 2=?, 3=AR, 4=Description(Title), 5=MPN(ISBN), 6=Price, 7=Preferred Vendor, 8=Category, 9=Inventory Item Class, 10=JV Code, 11=Authors, 12=PageCount, 13=Description(fetched), 14=ImageURL, 15=Dimensions, 16=Binding, 17=Publisher_Lookup
const COL = {
  ibcCode: 0,
  star: 1,
  col2: 2,
  ar: 3,
  title: 4,
  isbn: 5,
  price: 6,
  vendor: 7,
  category: 8,
  listClass: 9,
  jvCode: 10,
  authors: 11,
  pageCount: 12,
  description: 13,
  imageUrl: 14,
  dimensions: 15,
  binding: 16,
  publisherLookup: 17,
};

// BigCommerce header
const bcHeader = [
  'Item Type',
  'Product ID',
  'Product Name',
  'Product Type',
  'Product Code/SKU',
  'Bin Picking Number',
  'Brand Name',
  'Option Set',
  'Option Set Align',
  'Product Description',
  'Price',
  'Cost Price',
  'Retail Price',
  'Sale Price',
  'Fixed Shipping Cost',
  'Free Shipping',
  'Product Warranty',
  'Product Weight',
  'Product Width',
  'Product Height',
  'Product Depth',
  'Allow Purchases?',
  'Product Visible?',
  'Product Availability',
  'Track Inventory',
  'Current Stock Level',
  'Low Stock Level',
  'Category',
  'Product Image ID - 1',
  'Product Image File - 1',
  'Product Image Description - 1',
  'Product Image Is Thumbnail - 1',
  'Product Image Sort - 1',
  'Search Keywords',
  'Page Title',
  'Meta Keywords',
  'Meta Description',
  'Product Condition',
  'Show Product Condition?',
  'Sort Order',
  'Product Tax Class',
  'Product UPC/EAN',
  'GPS Global Trade Item Number',
  'GPS Manufacturer Part Number',
  'Product Custom Fields',
];

const outputLines = [bcHeader.map(h => escapeCSV(h)).join(',')];

let count = 0;
for (let i = 1; i < lines.length; i++) {
  const fields = parseCSVLine(lines[i]);
  const isbn = fields[COL.isbn]?.trim();
  if (!isbn) continue;

  const title = fields[COL.title]?.trim() || '';
  const priceRaw = fields[COL.price]?.trim().replace('$', '') || '';
  const dim = parseDimensions(fields[COL.dimensions]?.trim() || '');
  const description = fields[COL.description]?.trim() || '';
  const imageUrl = fields[COL.imageUrl]?.trim() || '';
  const category = mapCategory(fields[COL.category]?.trim() || '', fields[COL.listClass]?.trim() || '');
  const vendor = fields[COL.vendor]?.trim() || '';
  const authors = fields[COL.authors]?.trim() || '';
  const ibcCode = fields[COL.ibcCode]?.trim() || '';
  const pageCount = fields[COL.pageCount]?.trim() || '';
  const binding = fields[COL.binding]?.trim() || '';

  // Build custom fields: Author, Page Count, Binding, Preferred Vendor
  const customFields: string[] = [];
  if (authors) customFields.push(`Author=${authors}`);
  if (pageCount) customFields.push(`Page Count=${pageCount}`);
  if (binding) customFields.push(`Binding=${binding}`);
  if (vendor) customFields.push(`Preferred Vendor=${vendor}`);

  // Build search keywords from title, authors, category
  const searchKeywords = [title, authors, fields[COL.category]?.trim()].filter(Boolean).join(', ');

  // Truncate description for meta
  const metaDesc = description.length > 160 ? description.substring(0, 157) + '...' : description;

  const row = [
    'Product',                           // Item Type
    '',                                  // Product ID (blank for new)
    title,                               // Product Name
    'P',                                 // Product Type (Physical)
    ibcCode,                             // Product Code/SKU
    '',                                  // Bin Picking Number
    vendor,                              // Brand Name
    '',                                  // Option Set
    '',                                  // Option Set Align
    description,                         // Product Description
    priceRaw,                            // Price
    '',                                  // Cost Price
    '',                                  // Retail Price
    '',                                  // Sale Price
    '',                                  // Fixed Shipping Cost
    '',                                  // Free Shipping
    '',                                  // Product Warranty
    dim.weight,                          // Product Weight
    dim.width,                           // Product Width
    dim.height,                          // Product Height
    dim.depth,                           // Product Depth
    'Y',                                 // Allow Purchases
    'Y',                                 // Product Visible
    'available',                         // Product Availability
    'none',                              // Track Inventory
    '',                                  // Current Stock Level
    '',                                  // Low Stock Level
    category,                            // Category
    '',                                  // Product Image ID
    imageUrl,                            // Product Image File
    title,                               // Product Image Description
    'Y',                                 // Product Image Is Thumbnail
    '0',                                 // Product Image Sort
    searchKeywords,                      // Search Keywords
    title,                               // Page Title
    '',                                  // Meta Keywords
    metaDesc,                            // Meta Description
    'New',                               // Product Condition
    'N',                                 // Show Product Condition
    String(i),                           // Sort Order
    '',                                  // Product Tax Class
    isbn,                                // Product UPC/EAN (ISBN)
    isbn,                                // GPS Global Trade Item Number (ISBN-13)
    isbn,                                // GPS Manufacturer Part Number
    customFields.join(';'),              // Product Custom Fields
  ];

  outputLines.push(row.map(v => escapeCSV(v)).join(','));
  count++;
}

fs.writeFileSync(OUTPUT, outputLines.join('\n'), 'utf-8');
console.log(`Converted ${count} products to BigCommerce format.`);
console.log(`Saved to: ${OUTPUT}`);
