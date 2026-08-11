// Parsing for the coordinator's own recipient list.
//
// Coordinators paste from wherever they keep addresses — a spreadsheet column,
// a comma-separated string out of another system, an Outlook "To" line with
// display names. So accept all of it: commas, semicolons, newlines, tabs, and
// "Name <addr@example.org>" forms.
//
// Addresses never leave the coordinator's browser. Nothing here is sent to our
// servers or stored on them; the draft opens in their own mail client.

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
  duplicates: number;
}

// Deliberately permissive: this gates a mailto draft the coordinator reviews
// before sending, not a delivery pipeline, so a false reject is worse than a
// false accept.
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i;

export function parseRecipients(raw: string): ParsedRecipients {
  // Angle-bracket addresses first ("Ann Whitfield <ann@school.org>", the shape
  // Outlook and Gmail put on the clipboard), removing the brackets so the
  // display name left behind is just loose words we can ignore.
  const bracketed: string[] = [];
  const rest = raw.replace(/<([^<>]*)>/g, (_full, inner: string) => {
    bracketed.push(inner.trim());
    return ' ';
  });

  const loose = rest
    .split(/[\s,;]+/)
    .map((t) => t.trim().replace(/^["'(]+|[)"'.,]+$/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;

  for (const token of [...bracketed, ...loose]) {
    if (!EMAIL_RE.test(token)) {
      // Only complain about things the coordinator clearly meant as an address.
      // Bare words are display-name leftovers, not mistakes worth reporting.
      if (token.includes('@') && !invalid.includes(token)) invalid.push(token);
      continue;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    valid.push(token);
  }
  return { valid, invalid, duplicates };
}

// Practical ceiling for a mailto: URL. Browsers and mail clients truncate well
// before the RFC allows, and a silently truncated recipient list would drop
// people without telling anyone — so we measure and degrade deliberately.
export const MAILTO_LIMIT = 1800;

export interface MailtoPlan {
  href: string;
  // true when the body was left out to keep the URL under the limit, so the
  // caller should put it on the clipboard and say so.
  bodyOmitted: boolean;
  // true when even the addresses alone will not fit; the caller should tell the
  // coordinator to paste them from the clipboard instead.
  tooManyRecipients: boolean;
}

export function buildMailto(recipients: string[], subject: string, body: string): MailtoPlan {
  const bcc = encodeURIComponent(recipients.join(','));
  const subj = encodeURIComponent(subject);
  const base = `mailto:?bcc=${bcc}&subject=${subj}`;
  const withBody = `${base}&body=${encodeURIComponent(body)}`;

  if (withBody.length <= MAILTO_LIMIT) {
    return { href: withBody, bodyOmitted: false, tooManyRecipients: false };
  }
  if (base.length <= MAILTO_LIMIT) {
    return { href: base, bodyOmitted: true, tooManyRecipients: false };
  }
  return { href: `mailto:?subject=${subj}`, bodyOmitted: true, tooManyRecipients: true };
}
