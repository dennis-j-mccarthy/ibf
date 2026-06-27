// Helpers for the platform DB's naive timestamps. Fair dates were written as
// US/Eastern local times into `timestamp without time zone` columns, so they
// are displayed as-is (no timezone conversion) with an ET label.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface NaiveDate {
  year: number;
  month: number; // 1-12
  day: number;
}

// Accepts 'YYYY-MM-DD HH:MM:SS', 'YYYY-MM-DDTHH:MM:SS(.sss)(Z)', or 'YYYY-MM-DD'.
export function parseNaiveDate(ts: string): NaiveDate | null {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function formatDateET(ts: string, opts: { year?: boolean } = { year: true }): string {
  const d = parseNaiveDate(ts);
  if (!d) return ts;
  return `${MONTHS[d.month - 1]} ${d.day}${opts.year ? `, ${d.year}` : ''}`;
}

export function formatRangeET(start: string, end: string): string {
  const s = parseNaiveDate(start);
  const e = parseNaiveDate(end);
  if (!s || !e) return `${start} – ${end}`;
  if (s.year === e.year) {
    return `${formatDateET(start, { year: false })} – ${formatDateET(end)} (ET)`;
  }
  return `${formatDateET(start)} – ${formatDateET(end)} (ET)`;
}

// Today's calendar date in US/Eastern.
function todayET(): NaiveDate {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const d = parseNaiveDate(iso);
  return d!;
}

function toUtcMs(d: NaiveDate): number {
  return Date.UTC(d.year, d.month - 1, d.day);
}

// Whole calendar days from today (ET) until the given naive ET date.
// 0 = today, negative = in the past.
export function daysUntil(ts: string): number | null {
  const target = parseNaiveDate(ts);
  if (!target) return null;
  return Math.round((toUtcMs(target) - toUtcMs(todayET())) / 86_400_000);
}

// Naive date shifted by N days, as 'YYYY-MM-DD' (for milestone math).
export function shiftDays(ts: string, days: number): string | null {
  const d = parseNaiveDate(ts);
  if (!d) return null;
  const shifted = new Date(toUtcMs(d) + days * 86_400_000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(
    shifted.getUTCDate()
  ).padStart(2, '0')}`;
}
