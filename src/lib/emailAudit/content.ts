// Parses a HubSpot marketing email's content.widgets into ordered content
// blocks and a complete list of outbound links.

export type ContentBlock =
  | { type: 'html'; html: string }
  | { type: 'image'; src: string; alt?: string }
  | { type: 'cta'; text: string; url: string };

export type FoundLink = { url: string; source: 'href' | 'cta'; text: string };

type Widget = { body?: Record<string, unknown> };

// content.widgets is a dict keyed by module id ("module-3-0-0"). Dict order is
// meaningless; template order comes from sorting the numeric parts of the key.
export function sortedWidgetKeys(widgets: Record<string, unknown>): string[] {
  const nums = (k: string) => (k.match(/\d+/g) ?? []).map(Number);
  return Object.keys(widgets).sort((a, b) => {
    const na = nums(a);
    const nb = nums(b);
    for (let i = 0; i < Math.max(na.length, nb.length); i++) {
      const d = (na[i] ?? -1) - (nb[i] ?? -1);
      if (d !== 0) return d;
    }
    return a.localeCompare(b);
  });
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

// HubSpot stores CTA/button destinations in dedicated fields with no href=
// anywhere in the email body. An audit that only regexes href="..." misses
// every button in every email -- a dead "VIEW FAQs" button and an expired
// Zoom registration link went unnoticed exactly that way. So: collect href=
// from rich text AND walk the CTA fields.
function ctaUrl(body: Record<string, unknown>): string | null {
  const link = body.link as Record<string, unknown> | undefined;
  const linkUrl = link?.url as Record<string, unknown> | undefined;
  return str(body.destination) ?? str(body.url) ?? str(linkUrl?.href) ?? null;
}

function ctaText(body: Record<string, unknown>): string | null {
  return str(body.button_text) ?? str(body.label) ?? null;
}

export function extractHrefs(html: string): string[] {
  return [...html.matchAll(/href\s*=\s*["']([^"']*)["']/gi)].map((m) => m[1]);
}

export function parseEmailContent(detail: Record<string, unknown>): {
  blocks: ContentBlock[];
  links: FoundLink[];
} {
  const content = detail.content as Record<string, unknown> | undefined;
  const widgets = (content?.widgets ?? {}) as Record<string, unknown>;
  const blocks: ContentBlock[] = [];
  const links: FoundLink[] = [];

  for (const key of sortedWidgetKeys(widgets)) {
    const body = (widgets[key] as Widget | undefined)?.body;
    if (!body || typeof body !== 'object') continue;

    const html = str(body.html);
    if (html) {
      blocks.push({ type: 'html', html });
      for (const url of extractHrefs(html)) {
        const textMatch = html.match(
          new RegExp(`href\\s*=\\s*["']${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>([^<]*)<`, 'i'),
        );
        links.push({ url, source: 'href', text: (textMatch?.[1] ?? '').trim().slice(0, 80) });
      }
    }

    const img = body.img as Record<string, unknown> | undefined;
    const imgSrc = str(img?.src);
    if (imgSrc) {
      blocks.push({ type: 'image', src: imgSrc, alt: str(img?.alt) ?? undefined });
    }

    const url = ctaUrl(body);
    const text = ctaText(body);
    if (url || text) {
      blocks.push({ type: 'cta', text: text ?? '', url: url ?? '' });
      // A CTA with no destination is itself a broken link ("" is classified
      // broken by the checker) -- that is the merge-field failure mode.
      links.push({ url: url ?? '', source: 'cta', text: (text ?? '').slice(0, 80) });
    }
  }

  return { blocks, links };
}
