// Classifies outbound links from audited emails.
//
// Categories: broken | works-via-redirect | ok | inconclusive. Only "broken"
// is surfaced in the UI; the rest stay queryable in EmailAuditLink.

export type LinkVerdict = {
  status: 'broken' | 'works-via-redirect' | 'ok' | 'inconclusive';
  httpStatus: number | null;
  finalUrl: string | null;
};

// Hosts that answer 400/403 to any automated request. Never report these as
// broken; a human has to eyeball them.
const INCONCLUSIVE_HOSTS = [
  'facebook.com', 'www.facebook.com', 'm.facebook.com',
  'instagram.com', 'www.instagram.com',
  'linkedin.com', 'www.linkedin.com',
  'twitter.com', 'x.com',
];

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export function isCheckableUrl(url: string): boolean {
  // "", "#", and bare "mailto:" are unresolved merge fields -- broken, but
  // there is nothing to fetch.
  return /^https?:\/\//i.test(url);
}

export function staticVerdict(url: string): LinkVerdict | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return { status: 'broken', httpStatus: null, finalUrl: null };
  if (/^mailto:\s*$/i.test(trimmed)) return { status: 'broken', httpStatus: null, finalUrl: null };
  if (/^mailto:.+@/i.test(trimmed)) return { status: 'ok', httpStatus: null, finalUrl: null };
  if (/^tel:/i.test(trimmed)) return { status: 'ok', httpStatus: null, finalUrl: null };
  if (!isCheckableUrl(trimmed)) return { status: 'broken', httpStatus: null, finalUrl: null };
  return null;
}

export async function checkLink(url: string): Promise<LinkVerdict> {
  const fixed = staticVerdict(url);
  if (fixed) return fixed;

  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { status: 'broken', httpStatus: null, finalUrl: null };
  }

  try {
    // Node's fetch follows all redirects including 308 (unlike Python's
    // urllib, which silently does not -- that once flagged 16 working links
    // as broken). redirect:'follow' is the default; set explicitly anyway.
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(15000),
    });
    const redirected = res.url && res.url !== url;
    if (res.ok) {
      return {
        status: redirected ? 'works-via-redirect' : 'ok',
        httpStatus: res.status,
        finalUrl: redirected ? res.url : null,
      };
    }
    if (INCONCLUSIVE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { status: 'inconclusive', httpStatus: res.status, finalUrl: null };
    }
    // 405 to a GET is a server quirk, not a dead page.
    if (res.status === 405) return { status: 'inconclusive', httpStatus: res.status, finalUrl: null };
    return { status: 'broken', httpStatus: res.status, finalUrl: redirected ? res.url : null };
  } catch {
    if (INCONCLUSIVE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { status: 'inconclusive', httpStatus: null, finalUrl: null };
    }
    return { status: 'broken', httpStatus: null, finalUrl: null };
  }
}
