// Branded staff email signature builder.
//
// Email signature HTML has to survive Gmail (strips <style> blocks and classes)
// and Outlook desktop (renders with Word: no flexbox, no grid, no float, no
// background-images, unreliable margins, ignores border-radius). So everything
// here is nested presentation tables with inline styles on every element,
// explicit img width/height, web-safe fonts, and absolute https asset URLs.
//
// Asset URLs are absolute against the production site on purpose: a signature
// pasted from localhost still has to render in the recipient's inbox.

export const SIGNATURE_ASSET_BASE = 'https://www.ignatiusbookfairs.com';

export interface Brand {
  key: string;
  label: string;
  logo: string;
  width: number;
  height: number;
  site: string;
  accent: string;
  ink: string;
}

export const BRANDS: Brand[] = [
  {
    key: 'ibf',
    label: 'Ignatius Book Fairs',
    logo: '/images/ibf-logo-blue.png',
    width: 190,
    height: 30,
    site: 'ignatiusbookfairs.com',
    accent: '#0088ff',
    ink: '#02176f',
  },
  {
    key: 'ibc',
    label: 'Ignatius Book Club',
    logo: '/images/ibc-logo.png',
    width: 180,
    height: 37,
    site: 'ignatiusbookclub.com',
    accent: '#0088ff',
    ink: '#02176f',
  },
  {
    key: 'ibb',
    label: 'Ignatius Book Battle',
    logo: '/images/ibb-logo.png',
    width: 62,
    height: 80,
    site: 'ignatiusbookfairs.com/book-battles',
    accent: '#ff6445',
    ink: '#02176f',
  },
];

// Official IBF social profiles -- always in the signature, as icon images
// hosted on the production site (same hosting caveat as the logo).
export const SOCIAL_LINKS = [
  { label: 'Facebook', url: 'https://www.facebook.com/IgnatiusBookFairs', icon: '/images/sig-facebook.png' },
  { label: 'Instagram', url: 'https://www.instagram.com/ignatiusbookfairs/', icon: '/images/sig-instagram.png' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/company/ignatiusbookfairs/posts/?feedView=all', icon: '/images/sig-linkedin.png' },
];

export interface SignatureFields {
  brand: string;
  layout: 'side' | 'stacked';
  firstName: string;
  lastName: string;
  credentials: string;
  title: string;
  email: string;
  phone: string;
  phoneExt: string;
  mobile: string;
  bookingUrl: string;
  linkTitle: string;
  tagline: string;
}

export const DEFAULT_FIELDS: SignatureFields = {
  brand: 'ibf',
  layout: 'side',
  firstName: '',
  lastName: '',
  credentials: '',
  title: '',
  email: '',
  phone: '(888) 771-2321',
  phoneExt: '',
  mobile: '',
  bookingUrl: '',
  linkTitle: 'Book a time with me',
  tagline: 'Great books. Real formation. Every fair.',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Strips everything but digits and a leading + so tel: links dial correctly.
const telHref = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+1${digits}`;
};

// Display format (888) 771-2321 regardless of how the number was stored.
const displayPhone = (raw: string) => {
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : raw.trim();
};

const abs = (path: string) => (path.startsWith('http') ? path : SIGNATURE_ASSET_BASE + path);

const FONT = 'Arial, Helvetica, sans-serif';

export function buildSignatureHtml(f: SignatureFields): string {
  const brand = BRANDS.find((b) => b.key === f.brand) ?? BRANDS[0];
  const name = [f.firstName, f.lastName].filter(Boolean).join(' ').trim();
  const fullName = f.credentials.trim() ? `${name}, ${f.credentials.trim()}` : name;

  // One contact line. Outlook drops margins, so spacing lives in line-height.
  const line = (inner: string) =>
    `<tr><td style="font-family:${FONT};font-size:13px;line-height:19px;mso-line-height-rule:exactly;color:#3a3f4b;padding:0;">${inner}</td></tr>`;

  const link = (href: string, text: string) =>
    `<a href="${esc(href)}" style="color:${brand.accent};text-decoration:none;">${esc(text)}</a>`;

  const contactRows: string[] = [];
  if (f.email.trim()) contactRows.push(line(link(`mailto:${f.email.trim()}`, f.email.trim())));
  // Phones keep their tel: links for mobile taps but wear the body ink, not
  // the accent -- a wall of blue reads as noise.
  const phoneLink = (raw: string) =>
    `<a href="tel:${telHref(raw)}" style="color:#3a3f4b;text-decoration:none;">${esc(displayPhone(raw))}</a>`;
  if (f.phone.trim()) {
    const ext = f.phoneExt.trim() ? ` ext. ${esc(f.phoneExt.trim())}` : '';
    contactRows.push(line(`${phoneLink(f.phone)}${ext}`));
  }
  if (f.mobile.trim()) contactRows.push(line(`${phoneLink(f.mobile)} <span style="color:#a0a4b0;">mobile</span>`));
  contactRows.push(line(link(`https://${brand.site}`, brand.site)));
  if (f.bookingUrl.trim())
    contactRows.push(
      line(
        `<a href="${esc(f.bookingUrl.trim())}" style="color:${brand.accent};text-decoration:none;font-weight:bold;">${esc(f.linkTitle.trim() || 'Book a time with me')}</a>`
      )
    );
  // Icon images hosted on the prod site, like the logo. Explicit width/height
  // and display:inline-block keep Outlook from stretching them.
  contactRows.push(
    `<tr><td style="padding:7px 0 0;">${SOCIAL_LINKS.map(
      (s) =>
        `<a href="${esc(s.url)}" style="text-decoration:none;"><img src="${esc(abs(s.icon))}" width="22" height="22" alt="${esc(s.label)}" style="display:inline-block;border:0;vertical-align:middle;" /></a>`
    ).join('&nbsp;&nbsp;')}</td></tr>`
  );

  const nameBlock = `
        <tr><td style="font-family:${FONT};font-size:16px;line-height:20px;mso-line-height-rule:exactly;font-weight:bold;color:${brand.ink};padding:0 0 2px;">${esc(fullName)}</td></tr>
        ${f.title.trim() ? `<tr><td style="font-family:${FONT};font-size:13px;line-height:18px;mso-line-height-rule:exactly;color:#7e828f;padding:0 0 8px;">${esc(f.title.trim())}</td></tr>` : '<tr><td style="padding:0 0 6px;font-size:0;line-height:0;">&nbsp;</td></tr>'}
        ${contactRows.join('\n        ')}`;

  const logoImg = `<img src="${esc(abs(brand.logo))}" width="${brand.width}" height="${brand.height}" alt="${esc(brand.label)}" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;

  // Side-by-side: tagline sits under the logo in the left column, width-capped
  // to the logo so it wraps instead of pushing the divider.
  // One phrase per line ("Great books. / Real formation. / Every fair.") --
  // sentence breaks become <br/>, so the default tagline reads as three lines.
  const taglineUnderLogo = f.tagline.trim()
    ? `<tr><td style="font-family:${FONT};font-size:11px;line-height:15px;mso-line-height-rule:exactly;color:#a0a4b0;padding:8px 0 0;width:${brand.width}px;">${esc(f.tagline.trim()).replace(/\.\s+/g, '.<br />')}</td></tr>`
    : '';

  if (f.layout === 'stacked') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};">
  <tr><td style="padding:0 0 10px;">${logoImg}</td></tr>
  <tr><td style="border-top:2px solid ${brand.accent};padding:10px 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${nameBlock}
    </table>
  </td></tr>
  ${f.tagline.trim() ? `<tr><td style="font-family:${FONT};font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:#a0a4b0;padding:12px 0 0;">${esc(f.tagline.trim())}</td></tr>` : ''}
</table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};">
  <tr>
    <td style="padding:0 18px 0 0;vertical-align:top;width:${brand.width}px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="padding:0;">${logoImg}</td></tr>
        ${taglineUnderLogo}
      </table>
    </td>
    <td style="width:2px;background-color:${brand.accent};font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:0 0 0 18px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        ${nameBlock}
      </table>
    </td>
  </tr>
</table>`;
}
