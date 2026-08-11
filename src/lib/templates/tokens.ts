// Merge tokens for the template library. A template body (or a visual
// template's param strings) carries {{token}} placeholders; the coordinator
// dashboard resolves them from that school's real fair data, and the admin
// studio resolves them from SAMPLE_VALUES so editors see a realistic preview.

export interface TokenDef {
  key: string;
  label: string;
  // Shown in the admin studio preview.
  sample: string;
  // Used on the coordinator side when the real value is missing. An empty
  // fallback means the token collapses to nothing rather than leaving a hole.
  fallback: string;
  help: string;
}

export const TOKENS: TokenDef[] = [
  { key: 'school_name', label: 'School name', sample: 'St. Bernadette Catholic School', fallback: 'our school', help: "The school's name as it appears in the platform." },
  { key: 'school_city', label: 'City', sample: 'Springfield', fallback: '', help: 'School city.' },
  { key: 'school_state', label: 'State', sample: 'IL', fallback: '', help: 'School state.' },
  { key: 'fair_dates', label: 'Fair dates', sample: 'Oct 14 – Oct 18, 2026', fallback: 'the dates below', help: 'Formatted start–end range for the upcoming fair.' },
  { key: 'fair_start_date', label: 'Start date', sample: 'Oct 14, 2026', fallback: '', help: 'First day of the fair.' },
  { key: 'fair_end_date', label: 'End date', sample: 'Oct 18, 2026', fallback: '', help: 'Last day of the fair.' },
  { key: 'fair_type', label: 'Fair type', sample: 'Catholic In-Person', fallback: 'book fair', help: 'Catholic / Parish / Public / Virtual, from the HubSpot deal type.' },
  { key: 'fair_location', label: 'Fair location', sample: 'the school library', fallback: 'the school', help: 'Where the fair is set up. Coordinators can edit this before sending.' },
  { key: 'shop_url', label: 'Shop link', sample: 'store.ignatiusbookfairs.com', fallback: 'store.ignatiusbookfairs.com', help: "The school's online shopping link, pre-filled with the school id." },
  { key: 'family_signup_url', label: 'Family signup link', sample: 'store.ignatiusbookfairs.com/?signup=true', fallback: 'store.ignatiusbookfairs.com', help: 'Sign-up link that pre-selects this school for parents.' },
  { key: 'teacher_signup_url', label: 'Teacher signup link', sample: 'store.ignatiusbookfairs.com/?signup=true', fallback: 'store.ignatiusbookfairs.com', help: 'Sign-up link that pre-selects this school for teachers.' },
  { key: 'coordinator_name', label: 'Coordinator name', sample: 'Maria Ortiz', fallback: 'Your Book Fair Coordinator', help: 'Chair / organizer on the HubSpot deal.' },
  { key: 'coordinator_email', label: 'Coordinator email', sample: 'mortiz@stbernadette.org', fallback: '', help: 'Chair / organizer email on the HubSpot deal.' },
  { key: 'principal_name', label: 'Principal name', sample: 'Dr. Ann Whitfield', fallback: 'our principal', help: 'Principal name on the HubSpot deal.' },
  { key: 'rep_name', label: 'Ignatius rep', sample: 'Alma Cue', fallback: 'your Ignatius representative', help: 'The Ignatius rep assigned to this fair.' },
  { key: 'days_until_fair', label: 'Days until fair', sample: '21', fallback: '', help: 'Whole days from today until the fair opens.' },
  { key: 'classroom_count', label: 'Classroom count', sample: '18', fallback: '', help: 'Classrooms set up for this fair.' },
  { key: 'current_year', label: 'Current year', sample: '2026', fallback: '', help: 'The current calendar year.' },
];

export const TOKEN_KEYS = new Set(TOKENS.map((t) => t.key));

export type TokenValues = Record<string, string>;

export const SAMPLE_VALUES: TokenValues = Object.fromEntries(TOKENS.map((t) => [t.key, t.sample]));

const TOKEN_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

// Replace every {{token}} with its value. A known token with no value falls
// back to its declared fallback; an unknown token is left visible so a typo in
// the studio is obvious rather than silently blank.
export function renderTokens(text: string, values: TokenValues): string {
  return text.replace(TOKEN_RE, (match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (!TOKEN_KEYS.has(key)) return match;
    const value = (values[key] ?? '').trim();
    if (value) return value;
    return TOKENS.find((t) => t.key === key)?.fallback ?? '';
  });
}

// Every {{token}} in the text that isn't a known token — surfaced in the studio
// so an editor sees the typo instead of shipping it.
export function unknownTokens(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TOKEN_RE)) {
    const key = m[1].toLowerCase();
    if (!TOKEN_KEYS.has(key)) out.add(key);
  }
  return [...out];
}
