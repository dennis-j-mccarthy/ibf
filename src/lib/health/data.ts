/**
 * Health page content. EDIT THIS FILE to update the status board -- it is the
 * single source of truth for /health. Changes need a deploy (push to main).
 *
 * Honesty rules, because this page exists to be believed:
 *  - `incidents` must be REAL outages. The uptime figures and the day strip are
 *    computed from it, so anything invented here is a false claim to
 *    stakeholders and one contradicted number discredits the whole page.
 *  - `monitoringSince` is the date from which we can actually vouch for uptime.
 *    Days before it render as "no data" grey, never as green. Leave it null
 *    until real incident history exists.
 */

export type Project = 'lead' | 'store';

export type ItemStatus =
  | 'operational' // working, verified
  | 'degraded' // works, but a minor fault is known -- scale it with a denominator
  | 'buildout' // new feature being built -- nothing is broken
  | 'investigating' // reported, being diagnosed
  | 'in-progress' // fix underway for something that IS broken
  | 'monitoring' // fix shipped, watching
  | 'resolved'; // done and closed

export interface ProjectMeta {
  id: Project;
  name: string;
  url: string;
  blurb: string;
}

/** Who is doing the work. Rendered as its own pill, kept out of the status
 *  label so "what state is this in" and "who owns it" stay separate. */
export type Owner = 'Matellio' | 'Dennis' | 'Kristin';

/**
 * Who may leave a comment. A fixed list rather than a free-text name field:
 * the page is behind one shared password, so without this anyone with the link
 * could post under any name they liked. Enforced server-side too -- the
 * dropdown alone would only stop honest users.
 */
export const STAKEHOLDERS = [
  'Dennis',
  'Kristin',
  'Jessica M',
  'Kim',
  'Jeannette',
  'Jeanette',
  'Annie',
  'Father',
  'Jogendra',
  'Punit',
] as const;

export type Stakeholder = (typeof STAKEHOLDERS)[number];

export interface HealthItem {
  id: string;
  project: Project;
  title: string;
  detail: string;
  status: ItemStatus;
  owners?: Owner[];
  /** ISO date (YYYY-MM-DD). When it was first raised. */
  reportedOn?: string;
  /** ISO date. Start of the expected delivery window. Pairs with targetDate to
   *  render a range ("Sep 1 – 11, 2026") instead of a bare deadline. */
  startDate?: string;
  /** ISO date. Expected completion, for in-progress work. */
  targetDate?: string;
  /** ISO date. When it was closed out. */
  resolvedOn?: string;
}

export interface Incident {
  project: Project;
  /** ISO datetime the outage began. */
  start: string;
  /** Duration in minutes. */
  minutes: number;
  cause: string;
}

export const PROJECTS: ProjectMeta[] = [
  {
    id: 'lead',
    name: 'IBF Lead Generation Site',
    url: 'https://www.ignatiusbookfairs.com',
    blurb: 'Marketing site, resource library, coordinator dashboard and sign-up forms.',
  },
  {
    id: 'store',
    name: 'IBF Store',
    url: 'https://shop.ignatiusbookfairs.com',
    blurb: 'Storefront and checkout where families and coordinators buy.',
  },
];

/**
 * Date from which uptime is actually measured, per project. null = we have no
 * verified history yet, so the day strip shows grey rather than implying green.
 * Set this to an ISO date once real incident data below is complete.
 */
export const MONITORING_SINCE: Record<Project, string | null> = {
  lead: '2026-05-26',
  store: '2026-05-26',
};

/**
 * REAL outages only. Empty = "no outages in the covered window", which is what
 * turns the strip green and the uptime figure to 100%. That is an assertion
 * Dennis has made, not a measurement -- add any incident that surfaces, because
 * a single remembered outage contradicting this page discredits all of it.
 */
export const INCIDENTS: Incident[] = [
  // Duration and cause are placeholders -- they drive the uptime percentage and
  // the tooltip, so replace them with the real values.
  { project: 'store', start: '2026-08-05T14:00:00Z', minutes: 45, cause: 'Outage — details to confirm' },
];

/**
 * Scope note shown prominently at the top of the board. Exists to stop the
 * page being read as a complete project list -- marketing work is tracked
 * elsewhere and its absence here is not a status claim.
 */
export const SCOPE_NOTE =
  'This board covers site functionality, known issues and downtime only. It does not include ongoing marketing projects on either site — those are tracked in ClickUp.';

export const ITEMS: HealthItem[] = [
  {
    id: 'store-checkout',
    project: 'store',
    title: 'Storefront and checkout',
    detail: 'Browsing, cart and checkout on the BigCommerce storefront.',
    status: 'operational',
  },
  {
    id: 'store-donate',
    project: 'store',
    title: 'Donate',
    detail: 'Donation flow build and integration.',
    status: 'buildout',
    owners: ['Matellio', 'Dennis'],
    targetDate: '2026-09-01',
  },
  {
    id: 'store-ewallet-edge',
    project: 'store',
    title: 'eWallet edge cases',
    detail: 'Handling of edge-case states in the eWallet balance and redemption flow.',
    status: 'in-progress',
    owners: ['Dennis', 'Kristin', 'Matellio'],
    startDate: '2026-09-01',
    targetDate: '2026-09-11',
  },
  {
    id: 'store-ewallet-gifting',
    project: 'store',
    title: 'eWallet gifting',
    detail:
      'Gift-a-Wallet: tokenized link letting a parent or family member fund a specific child’s eWallet balance.',
    status: 'in-progress',
    owners: ['Dennis', 'Matellio', 'Kristin'],
    startDate: '2026-09-01',
    targetDate: '2026-09-11',
  },
  {
    id: 'store-large-cart',
    project: 'store',
    title: 'Large cart errors',
    detail: 'Reported errors on large carts. Digging in on reproducing the errors.',
    status: 'investigating',
    owners: ['Matellio'],
  },
  {
    id: 'store-public-version',
    project: 'store',
    title: 'Public version',
    detail: 'Public-school version of the storefront.',
    status: 'buildout',
    owners: ['Dennis'],
  },
  {
    id: 'lead-form-reports',
    project: 'lead',
    title: 'Customers reporting they cannot use a form',
    detail:
      'Suspected user error — no fault reproduced on our side so far. We have reached out to the customer for details.',
    status: 'investigating',
    owners: ['Dennis'],
  },
  {
    id: 'lead-resources',
    project: 'lead',
    title: 'Resource library and downloads',
    detail: '2 of 91 resources have a reported broken link.',
    status: 'degraded',
    owners: ['Dennis'],
  },
  {
    id: 'lead-forms',
    project: 'lead',
    title: 'Sign-up and interest forms',
    detail: 'Lead capture forms submit and route to the assigned rep territory.',
    status: 'operational',
  },
  {
    id: 'lead-coordinator',
    project: 'lead',
    title: 'Coordinator dashboard sign-in',
    detail: 'Magic-link sign-in for book fair coordinators.',
    status: 'operational',
  },
];

// ---------------------------------------------------------------- derived

export const STATUS_LABEL: Record<ItemStatus, string> = {
  operational: 'Fully operational',
  degraded: 'Minor issue reported',
  buildout: 'Buildout in progress',
  investigating: 'Investigating',
  'in-progress': 'Fix in progress',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
};

/** Statuses that count as "working right now". */
const HEALTHY: ItemStatus[] = ['operational', 'resolved', 'monitoring'];

export function isHealthy(s: ItemStatus): boolean {
  return HEALTHY.includes(s);
}

/**
 * New work rather than a defect. Counted separately from open issues -- lumping
 * a feature buildout in with "large cart errors" would inflate the problem count
 * and undercut the point of the board.
 */
export function isBuildout(s: ItemStatus): boolean {
  return s === 'buildout';
}

export function itemsFor(project: Project): HealthItem[] {
  return ITEMS.filter((i) => i.project === project);
}

export function incidentsFor(project: Project): Incident[] {
  return INCIDENTS.filter((i) => i.project === project);
}

/**
 * Days since the most recent incident, measured from monitoringSince when there
 * are no incidents. Returns null when we have no measured history at all --
 * the UI must show "not yet measured", not a number.
 */
export function daysSinceLastIncident(project: Project, now: Date): number | null {
  const since = MONITORING_SINCE[project];
  const list = incidentsFor(project);
  if (!list.length) {
    if (!since) return null;
    return dayDiff(new Date(since), now);
  }
  const latest = list
    .map((i) => new Date(i.start).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  return dayDiff(new Date(latest), now);
}

/** Uptime percentage over `days`, or null when there is no measured history. */
export function uptimePct(project: Project, days: number, now: Date): number | null {
  const since = MONITORING_SINCE[project];
  if (!since) return null;
  const windowStart = new Date(now.getTime() - days * 86400000);
  const measuredFrom = new Date(Math.max(new Date(since).getTime(), windowStart.getTime()));
  const totalMin = (now.getTime() - measuredFrom.getTime()) / 60000;
  if (totalMin <= 0) return null;
  const downMin = incidentsFor(project)
    .filter((i) => new Date(i.start) >= measuredFrom)
    .reduce((sum, i) => sum + i.minutes, 0);
  return Math.max(0, Math.min(100, ((totalMin - downMin) / totalMin) * 100));
}

function dayDiff(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

/**
 * One entry per day for the status strip, oldest first.
 * 'unknown' before monitoring began -- deliberately not green.
 */
export function dayStrip(
  project: Project,
  days: number,
  now: Date,
): { date: string; state: 'up' | 'down' | 'unknown'; minutes: number }[] {
  const since = MONITORING_SINCE[project] ? new Date(MONITORING_SINCE[project]!) : null;
  const list = incidentsFor(project);
  const out: { date: string; state: 'up' | 'down' | 'unknown'; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    if (!since || d < since) {
      out.push({ date: key, state: 'unknown', minutes: 0 });
      continue;
    }
    const minutes = list
      .filter((x) => x.start.slice(0, 10) === key)
      .reduce((s, x) => s + x.minutes, 0);
    out.push({ date: key, state: minutes > 0 ? 'down' : 'up', minutes });
  }
  return out;
}
