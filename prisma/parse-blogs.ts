import * as fs from 'fs';
import * as path from 'path';

// Simple CSV parser that handles quoted fields with commas
function parseCSV(content: string): Record<string, string>[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentLine += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  // Parse header
  const headerLine = lines[0];
  const headers: string[] = [];
  let field = '';
  inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  headers.push(field.trim());
  
  // Parse rows
  const results: Record<string, string>[] = [];
  
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;
    
    const row: Record<string, string> = {};
    const values: string[] = [];
    field = '';
    inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Remove surrounding quotes if present
        let val = field.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        values.push(val);
        field = '';
      } else {
        field += char;
      }
    }
    // Don't forget last field
    let val = field.trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    values.push(val);
    
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    
    results.push(row);
  }
  
  return results;
}

// Read and parse CSV
const csvPath = path.join(__dirname, 'blogs.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const blogs = parseCSV(csvContent);

// Filter out archived/draft and transform to seed format
const seedBlogs = blogs
  .filter(blog => blog['Archived'] !== 'true' && blog['Draft'] !== 'true')
  .map(blog => {
    const colorMap: Record<string, string> = {
      '#02a76f': 'green',
      '#ff6445': 'orange',
      '#ffd41d': 'orange',
      '#0066ff': 'blue',
    };
    
    const rawColor = blog['Color'] || '';
    let color = 'orange';
    if (rawColor.includes('#02a76f') || rawColor.includes('green')) color = 'green';
    else if (rawColor.includes('#0066ff') || rawColor.includes('blue')) color = 'blue';
    else if (rawColor.includes('#ff')) color = 'orange';
    
    return {
      title: blog['Name']?.trim() || '',
      slug: blog['Slug']?.trim() || '',
      summary: (blog['Post Summary'] || '').replace(/^"|"$/g, '').trim(),
      content: (blog['Post Body'] || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim(),
      thumbnail: blog['Main Image']?.trim() || null,
      thumbnailSmall: blog['Thumbnail image']?.trim() || null,
      category: blog['Version']?.trim() || 'Catholic',
      color: color,
      featured: blog['Featured?'] === 'true',
      archived: false,
      publishedAt: blog['Published On'] ? new Date(blog['Published On']) : new Date(),
    };
  })
  .filter(blog => blog.title && blog.slug);

// Output as TypeScript
console.log('const blogs = [');
seedBlogs.forEach((blog, idx) => {
  console.log('  {');
  console.log(`    title: ${JSON.stringify(blog.title)},`);
  console.log(`    slug: ${JSON.stringify(blog.slug)},`);
  console.log(`    summary: ${JSON.stringify(blog.summary)},`);
  console.log(`    content: ${JSON.stringify(blog.content)},`);
  console.log(`    thumbnail: ${blog.thumbnail ? JSON.stringify(blog.thumbnail) : 'null'},`);
  console.log(`    thumbnailSmall: ${blog.thumbnailSmall ? JSON.stringify(blog.thumbnailSmall) : 'null'},`);
  console.log(`    category: ${JSON.stringify(blog.category)},`);
  console.log(`    color: ${JSON.stringify(blog.color)},`);
  console.log(`    featured: ${blog.featured},`);
  console.log(`    archived: false,`);
  console.log(`    publishedAt: new Date(${JSON.stringify(blog.publishedAt.toISOString())}),`);
  console.log(`  }${idx < seedBlogs.length - 1 ? ',' : ''}`);
});
console.log('];');

console.error(`\nProcessed ${seedBlogs.length} blog posts`);
