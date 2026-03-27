import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ logo: null }, { status: 400 });
  }

  // Clean domain
  let cleanDomain = domain.trim().toLowerCase();
  try {
    if (cleanDomain.includes('://')) cleanDomain = new URL(cleanDomain).hostname;
    else if (cleanDomain.includes('/')) cleanDomain = cleanDomain.split('/')[0];
  } catch { /* use as-is */ }

  // Try Clearbit first (fast, high quality)
  const clearbitUrl = `https://logo.clearbit.com/${cleanDomain.replace(/^www\./, '')}`;
  try {
    const clearbitRes = await fetch(clearbitUrl, { method: 'HEAD' });
    if (clearbitRes.ok) {
      return NextResponse.json({ logo: clearbitUrl });
    }
  } catch { /* fall through */ }

  // Scrape the school's website for a logo
  const urlsToTry = [
    `https://${cleanDomain}`,
    `https://www.${cleanDomain.replace(/^www\./, '')}`,
  ];

  for (const siteUrl of urlsToTry) {
    try {
      const res = await fetch(siteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IBFBot/1.0)' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;

      const html = await res.text();

      // Try img tags with "logo" in src, alt, class, or id (most reliable)
      const imgRegex = /<img[^>]*>/gi;
      let imgMatch;
      while ((imgMatch = imgRegex.exec(html)) !== null) {
        const tag = imgMatch[0];
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('logo')) {
          const srcMatch = tag.match(/src=["']([^"']+)["']/i);
          if (srcMatch?.[1]) {
            const logoUrl = resolveUrl(srcMatch[1], siteUrl);
            if (logoUrl) return NextResponse.json({ logo: logoUrl });
          }
        }
      }

      // Try apple-touch-icon
      const touchIcon = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i);
      if (touchIcon?.[1]) {
        const iconUrl = resolveUrl(touchIcon[1], siteUrl);
        if (iconUrl) return NextResponse.json({ logo: iconUrl });
      }

      // Fall back to og:image
      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogMatch?.[1]) {
        const ogUrl = resolveUrl(ogMatch[1], siteUrl);
        if (ogUrl) return NextResponse.json({ logo: ogUrl });
      }

    } catch { /* try next URL */ }
  }

  return NextResponse.json({ logo: null });
}

function resolveUrl(url: string, base: string): string | null {
  try {
    if (url.startsWith('data:')) return null;
    return new URL(url, base).href;
  } catch {
    return null;
  }
}
