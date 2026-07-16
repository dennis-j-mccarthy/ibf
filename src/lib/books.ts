// Fetches book data (title, cover image, canonical link, SKU) from
// shop.ignatiusbookfairs.com product URLs by parsing the page's JSON-LD Product
// data (the real structured product data, not OG share tags), with <h1> /
// canonical fallbacks. Restricted to the IBF shop domain to avoid SSRF.

export type FeaturedBook = { url: string; title: string; image: string; sku?: string };

const ALLOWED_HOST = /(^|\.)ignatiusbookfairs\.com$/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalize a JSON-LD "image" (string | string[] | ImageObject) to a URL.
function imageUrl(img: unknown): string {
  if (typeof img === 'string') return img;
  if (Array.isArray(img) && img.length) return imageUrl(img[0]);
  if (img && typeof img === 'object' && 'url' in img) return String((img as { url: unknown }).url);
  return '';
}

function jsonLdProduct(html: string): { name?: string; image?: string; url?: string; sku?: string } | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of scripts) {
    try {
      const data = JSON.parse(m[1].trim());
      const items = Array.isArray(data) ? data : data['@graph'] && Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const it of items) {
        const type = it && it['@type'];
        const isProduct = type === 'Product' || type === 'Book' || (Array.isArray(type) && (type.includes('Product') || type.includes('Book')));
        if (isProduct && it.name) {
          return { name: String(it.name), image: imageUrl(it.image), url: it.url ? String(it.url) : undefined, sku: it.sku ? String(it.sku) : undefined };
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return null;
}

export async function fetchBook(rawUrl: string): Promise<FeaturedBook | null> {
  let u: URL;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !ALLOWED_HOST.test(u.hostname)) return null;
  try {
    const res = await fetch(u.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (IBF blog book fetcher)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    const p = jsonLdProduct(html);
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];

    const title = decodeEntities(p?.name || (h1 ? h1.replace(/<[^>]+>/g, '') : '') || '');
    const image = p?.image || '';
    const url = p?.url || canonical || u.toString();
    if (!title) return null;
    return { url, title, image, sku: p?.sku };
  } catch {
    return null;
  }
}

// Fetch up to 5 books, de-duplicated, dropping any that fail.
export async function fetchBooks(urls: string[]): Promise<FeaturedBook[]> {
  const uniq = [...new Set(urls.map((s) => s.trim()).filter(Boolean))].slice(0, 5);
  const results = await Promise.all(uniq.map(fetchBook));
  return results.filter((b): b is FeaturedBook => b !== null);
}

// Deterministic "Featured Books" HTML block appended to a generated article.
// Inline-styled so it renders without depending on site CSS.
export function featuredBooksHtml(books: FeaturedBook[]): string {
  if (!books.length) return '';
  const cards = books
    .map(
      (b) => `<a href="${b.url}" target="_blank" rel="noopener" style="display:flex;flex-direction:column;align-items:center;text-decoration:none;color:#02176f;width:150px">
  <img src="${b.image}" alt="${b.title.replace(/"/g, '&quot;')}" style="width:130px;height:auto;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15)"/>
  <span style="margin-top:8px;font-weight:600;font-size:14px;text-align:center;line-height:1.25">${b.title}</span>
</a>`
    )
    .join('');
  return `\n<h2>Featured Books</h2>\n<div style="display:flex;flex-wrap:wrap;gap:20px;justify-content:center;margin:16px 0">\n${cards}\n</div>\n`;
}
