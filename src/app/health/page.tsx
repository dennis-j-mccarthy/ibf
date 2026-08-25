import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { HEALTH_COOKIE, isUnlocked } from '@/lib/health/access';
import PasswordGate from './PasswordGate';
import HealthDashboard from './HealthDashboard';
import {
  PROJECTS,
  MONITORING_SINCE,
  itemsFor,
  dayStrip,
  uptimePct,
  daysSinceLastIncident,
} from '@/lib/health/data';

export const metadata: Metadata = {
  title: 'System Health | Ignatius Book Fairs',
  // Shared-password page -- keep it out of search results.
  robots: { index: false, follow: false },
};

// Reads a cookie and computes against "now", so never prerender it.
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 90;

export default async function HealthPage() {
  if (!isUnlocked((await cookies()).get(HEALTH_COOKIE)?.value)) {
    return <PasswordGate />;
  }

  // Computed on the server so every viewer sees the same numbers.
  const now = new Date();
  const projects = PROJECTS.map((p) => ({
    meta: p,
    items: itemsFor(p.id),
    strip: dayStrip(p.id, WINDOW_DAYS, now),
    uptime: uptimePct(p.id, WINDOW_DAYS, now),
    daysSince: daysSinceLastIncident(p.id, now),
    monitoringSince: MONITORING_SINCE[p.id],
  }));

  return (
    <HealthDashboard
      projects={projects}
      windowDays={WINDOW_DAYS}
      generatedAt={now.toISOString()}
      // Zero incidents is a legitimate good state, so the "no history" banner
      // keys off whether a monitoring baseline exists -- not off the count.
      hasBaseline={PROJECTS.every((p) => Boolean(MONITORING_SINCE[p.id]))}
    />
  );
}
