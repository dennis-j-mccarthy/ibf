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

// Official IBF social profiles. Toggleable per person: staff whose roles use
// custom links (personal booking pages, regional accounts) can switch any of
// these off rather than carry links that are wrong for them.
export const SOCIAL_LINKS = [
  { key: 'showFacebook' as const, label: 'Facebook', url: 'https://www.facebook.com/IgnatiusBookFairs' },
  { key: 'showInstagram' as const, label: 'Instagram', url: 'https://www.instagram.com/ignatiusbookfairs/' },
  { key: 'showLinkedin' as const, label: 'LinkedIn', url: 'https://www.linkedin.com/company/ignatiusbookfairs/posts/?feedView=all' },
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
  tagline: string;
  photoUrl: string;
  showSite: boolean;
  showFacebook: boolean;
  showInstagram: boolean;
  showLinkedin: boolean;
}

export const DEFAULT_FIELDS: SignatureFields = {
  brand: 'ibf',
  layout: 'side',
  firstName: '',
  lastName: '',
  credentials: '',
  title: '',
  email: '',
  phone: '888-771-2321',
  phoneExt: '',
  mobile: '',
  bookingUrl: '',
  tagline: 'Great books. Real formation. Every fair.',
  photoUrl: '',
  showSite: true,
  showFacebook: true,
  showInstagram: true,
  showLinkedin: true,
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Strips everything but digits and a leading + so tel: links dial correctly.
const telHref = (raw: string) => {
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+1${digits}`;
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
  if (f.phone.trim()) {
    const ext = f.phoneExt.trim() ? ` ext. ${esc(f.phoneExt.trim())}` : '';
    contactRows.push(line(`${link(`tel:${telHref(f.phone)}`, f.phone.trim())}${ext}`));
  }
  if (f.mobile.trim()) contactRows.push(line(`${link(`tel:${telHref(f.mobile)}`, f.mobile.trim())} <span style="color:#a0a4b0;">mobile</span>`));
  if (f.showSite) contactRows.push(line(link(`https://${brand.site}`, brand.site)));
  if (f.bookingUrl.trim())
    contactRows.push(
      line(
        `<a href="${esc(f.bookingUrl.trim())}" style="color:${brand.accent};text-decoration:none;font-weight:bold;">Book a time with me</a>`
      )
    );
  // Text links, not icons: icon images need hosting and get blocked or broken
  // by inbox image proxies; plain links survive Gmail and Outlook untouched.
  const socials = SOCIAL_LINKS.filter((s) => f[s.key]);
  if (socials.length)
    contactRows.push(
      line(socials.map((s) => link(s.url, s.label)).join('<span style="color:#a0a4b0;">&nbsp;&middot;&nbsp;</span>'))
    );

  const nameBlock = `
        <tr><td style="font-family:${FONT};font-size:16px;line-height:20px;mso-line-height-rule:exactly;font-weight:bold;color:${brand.ink};padding:0 0 2px;">${esc(fullName)}</td></tr>
        ${f.title.trim() ? `<tr><td style="font-family:${FONT};font-size:13px;line-height:18px;mso-line-height-rule:exactly;color:#7e828f;padding:0 0 8px;">${esc(f.title.trim())}</td></tr>` : '<tr><td style="padding:0 0 6px;font-size:0;line-height:0;">&nbsp;</td></tr>'}
        ${contactRows.join('\n        ')}`;

  const logoImg = `<img src="${esc(abs(brand.logo))}" width="${brand.width}" height="${brand.height}" alt="${esc(brand.label)}" style="display:block;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />`;

  const photoImg = f.photoUrl.trim()
    ? `<img src="${esc(abs(f.photoUrl.trim()))}" width="64" height="64" alt="${esc(name)}" style="display:block;border:0;outline:none;text-decoration:none;" />`
    : '';

  const taglineRow = f.tagline.trim()
    ? `<tr><td colspan="3" style="font-family:${FONT};font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:#a0a4b0;padding:12px 0 0;">${esc(f.tagline.trim())}</td></tr>`
    : '';

  if (f.layout === 'stacked') {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};">
  <tr><td style="padding:0 0 10px;">${logoImg}</td></tr>
  <tr><td style="border-top:2px solid ${brand.accent};padding:10px 0 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      ${photoImg ? `<tr><td style="padding:0 0 8px;">${photoImg}</td></tr>` : ''}
      ${nameBlock}
    </table>
  </td></tr>
  ${f.tagline.trim() ? `<tr><td style="font-family:${FONT};font-size:11px;line-height:16px;mso-line-height-rule:exactly;color:#a0a4b0;padding:12px 0 0;">${esc(f.tagline.trim())}</td></tr>` : ''}
</table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:${FONT};">
  <tr>
    <td style="padding:0 18px 0 0;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr><td style="padding:0 0 ${photoImg ? '10px' : '0'};">${logoImg}</td></tr>
        ${photoImg ? `<tr><td style="padding:0;">${photoImg}</td></tr>` : ''}
      </table>
    </td>
    <td style="width:2px;background-color:${brand.accent};font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:0 0 0 18px;vertical-align:top;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        ${nameBlock}
      </table>
    </td>
  </tr>
  ${taglineRow}
</table>`;
}
