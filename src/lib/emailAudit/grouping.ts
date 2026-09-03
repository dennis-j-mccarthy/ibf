// Groups marketing emails into sequence messages and collapses per-rep copies.
//
// Names follow `<Phase> <±offset>: <Title> | <Rep>`, e.g.
//   "VF Fair -15: Parent Letter | Amy"
//   "Contract +0: IP Thank you/Signed (Kim)"

export type ParsedName = {
  phase: string | null;
  offset: number | null;
  title: string;
  rep: string | null;
};

// Jeanette vs Jeannette is a real inconsistency in the data, so both appear.
const REPS = [
  'Kristin', 'Carmen', 'Amy', 'Alma', 'Jeannette', 'Jeanette', 'Julie',
  'Kim', 'Marni', 'Jenn', 'Jessica',
];

// Longest-first so "Virtual Fair" wins over "Fair" and "Event Contact" over
// "Contact".
const PHASES = [
  'Virtual Fair', 'Event Contact', 'VF Fair', 'Follow Up', 'Accounting',
  'Contract', 'Webinars', 'Workshop', 'Invoice', 'Contact', 'Inquire',
  'Rebook', 'BFIAB', 'Fair', 'VF',
].sort((a, b) => b.length - a.length);

// Customer-journey order for the page. Raw phase labels map into these
// sections; anything unmatched lands in "Other marketing emails".
export const JOURNEY_SECTIONS: { title: string; phases: string[] }[] = [
  { title: 'First enquiry', phases: ['Inquire'] },
  { title: 'Follow-up by school type', phases: ['Follow Up', 'BFIAB'] },
  { title: 'After first contact', phases: ['Contact', 'Event Contact'] },
  { title: 'In-person countdown', phases: ['Fair'] },
  { title: 'Virtual countdown', phases: ['Virtual Fair', 'VF Fair', 'VF'] },
  { title: 'After contract', phases: ['Contract', 'Rebook'] },
  { title: 'Invoicing', phases: ['Invoice'] },
  { title: 'Accounting', phases: ['Accounting'] },
  { title: 'Workshops', phases: ['Workshop'] },
  { title: 'Webinars', phases: ['Webinars'] },
];

// Strip the rep suffix FIRST and independently of phase parsing. If phase is
// parsed first, any name with an unrecognised phase loses its rep entirely
// (this once rendered "Sent as 3 rep copies ()" on 31 messages).
export function stripRep(name: string): { base: string; rep: string | null } {
  const trimmed = name.trim();
  for (const rep of REPS) {
    const pipe = new RegExp(`\\s*\\|\\s*${rep}\\s*$`, 'i');
    if (pipe.test(trimmed)) return { base: trimmed.replace(pipe, '').trim(), rep };
    const paren = new RegExp(`\\s*\\(${rep}\\)\\s*$`, 'i');
    if (paren.test(trimmed)) return { base: trimmed.replace(paren, '').trim(), rep };
  }
  return { base: trimmed, rep: null };
}

export function parseName(name: string): ParsedName {
  const { base, rep } = stripRep(name);
  for (const phase of PHASES) {
    const re = new RegExp(
      `^${phase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([+-]\\s*\\d+)?\\s*:\\s*(.+)$`,
      'i',
    );
    const m = base.match(re);
    if (m) {
      return {
        phase,
        offset: m[1] != null ? parseInt(m[1].replace(/\s+/g, ''), 10) : null,
        title: m[2].trim(),
        rep,
      };
    }
  }
  return { phase: null, offset: null, title: base, rep };
}

// Wording hash with rep names masked, to flag variants that differ beyond the
// signature (whitespace/case-insensitive).
export function variantHash(text: string): string {
  let t = text.toLowerCase();
  for (const rep of REPS) t = t.split(rep.toLowerCase()).join('%rep%');
  t = t.replace(/\s+/g, ' ').trim();
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

export type AuditEmailRow = {
  hubspotId: string;
  name: string;
  subject: string;
  blocks: unknown;
  links: { url: string; source: string; text: string }[];
};

export type GroupedMessage = {
  key: string;
  phase: string | null;
  offset: number | null;
  title: string;
  subject: string;
  reps: string[];
  copies: { hubspotId: string; name: string; rep: string | null }[];
  variantsDiffer: boolean;
  links: { url: string; source: string; text: string }[];
  // hubspotId of the copy whose blocks the modal renders
  previewId: string;
};

export function groupEmails(rows: AuditEmailRow[]): {
  sequenced: GroupedMessage[];
  other: GroupedMessage[];
} {
  const byKey = new Map<string, GroupedMessage & { hashes: Set<string> }>();
  const other: GroupedMessage[] = [];

  for (const row of rows) {
    const parsed = parseName(row.name);
    const blocksText = JSON.stringify(row.blocks ?? '');

    if (!parsed.phase) {
      other.push({
        key: `other:${row.hubspotId}`,
        phase: null,
        offset: null,
        title: parsed.title,
        subject: row.subject,
        reps: parsed.rep ? [parsed.rep] : [],
        copies: [{ hubspotId: row.hubspotId, name: row.name, rep: parsed.rep }],
        variantsDiffer: false,
        links: row.links,
        previewId: row.hubspotId,
      });
      continue;
    }

    const key = `${parsed.phase}|${parsed.offset ?? ''}|${parsed.title.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        phase: parsed.phase,
        offset: parsed.offset,
        title: parsed.title,
        subject: row.subject,
        reps: parsed.rep ? [parsed.rep] : [],
        copies: [{ hubspotId: row.hubspotId, name: row.name, rep: parsed.rep }],
        variantsDiffer: false,
        links: [...row.links],
        previewId: row.hubspotId,
        hashes: new Set([variantHash(blocksText)]),
      });
    } else {
      if (parsed.rep && !existing.reps.includes(parsed.rep)) existing.reps.push(parsed.rep);
      existing.copies.push({ hubspotId: row.hubspotId, name: row.name, rep: parsed.rep });
      existing.hashes.add(variantHash(blocksText));
      existing.variantsDiffer = existing.hashes.size > 1;
      for (const l of row.links) {
        if (!existing.links.some((e) => e.url === l.url)) existing.links.push(l);
      }
    }
  }

  const sequenced = [...byKey.values()]
    .map((entry) => {
      const { hashes, ...g } = entry;
      void hashes;
      return g;
    })
    .sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

  return { sequenced, other };
}
