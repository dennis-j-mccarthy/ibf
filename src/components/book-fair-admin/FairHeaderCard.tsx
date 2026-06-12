import { daysUntil, formatRangeET } from '@/lib/book-fair-admin/dates';
import CountdownCounter from '@/components/book-fair-admin/CountdownCounter';
import FairStatusStepper from '@/components/book-fair-admin/FairStatusStepper';
import HeaderGoal from '@/components/book-fair-admin/HeaderGoal';
import SchoolLogo from '@/components/book-fair-admin/SchoolLogo';

export interface FairContact {
  name: string;
  email: string | null;
}

interface Props {
  schoolName: string;
  city?: string | null;
  state?: string | null;
  startDate: string;
  endDate: string;
  // null = HubSpot unavailable, omit the badge entirely
  isVirtual: boolean | null;
  fairTypeLabel?: string | null;
  coordinator?: FairContact | null;
  aveAdmin?: FairContact | null;
  logoDomain?: string | null;
  currentStep?: number | null;
  schoolId: number;
  currentSales: number | null;
  lastFairSales: number | null;
}

function ContactBlock({ label, contact }: { label: string; contact: FairContact }) {
  return (
    <div>
      <p className="text-white/60 uppercase text-xs tracking-wide mb-0.5">{label}</p>
      <p className="font-semibold">{contact.name || '—'}</p>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="text-[#7fc4ff] hover:underline break-all">
          {contact.email}
        </a>
      )}
    </div>
  );
}

export default function FairHeaderCard({
  schoolName,
  city,
  state,
  startDate,
  endDate,
  isVirtual,
  fairTypeLabel,
  coordinator,
  aveAdmin,
  logoDomain,
  currentStep,
  schoolId,
  currentSales,
  lastFairSales,
}: Props) {
  const days = daysUntil(startDate);
  const location = [city, state].filter(Boolean).join(', ');

  let countdown: string;
  if (days === null) countdown = '';
  else if (days > 1) countdown = `${days} days until your fair starts`;
  else if (days === 1) countdown = 'Your fair starts tomorrow!';
  else if (days === 0) countdown = 'Your fair starts today!';
  else countdown = 'Your fair is underway!';

  return (
    <div className="bg-[#02176f] rounded-xl text-white p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-white/70 text-sm uppercase tracking-wide mb-1">Upcoming fair</p>
          <h2
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            {schoolName}
          </h2>
          {location && <p className="text-white/70 text-sm mb-1">{location}</p>}
          <p className="text-white/90">{formatRangeET(startDate, endDate)}</p>
        </div>
        {(fairTypeLabel || isVirtual !== null) && (
          <span className="inline-block bg-[#0088ff] text-white text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1 self-start sm:self-auto flex-shrink-0">
            {fairTypeLabel ?? (isVirtual ? 'Virtual' : 'In-person')}
          </span>
        )}
      </div>

      {/* Countdown + goal, equally weighted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 items-stretch">
        <div className="rounded-xl bg-white/5 p-4 flex flex-col">
          <p className="text-white/60 uppercase text-xs tracking-wide mb-2">Countdown</p>
          <div className="flex-1 flex items-center">
            {days !== null && days >= 1 ? (
              <CountdownCounter targetIso={startDate} initialDays={days} />
            ) : (
              <p className="text-[#ffd41d] font-semibold text-2xl">{countdown || 'Fair scheduled'}</p>
            )}
          </div>
        </div>
        <HeaderGoal schoolId={schoolId} currentSales={currentSales} lastFairSales={lastFairSales} />
      </div>

      {currentStep ? <FairStatusStepper currentStep={currentStep} /> : null}

      {(coordinator || aveAdmin || logoDomain) && (
        <div className="mt-5 pt-4 border-t border-white/15 flex items-end justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm flex-1 min-w-0">
            {coordinator && <ContactBlock label="Book Fair Coordinator" contact={coordinator} />}
            {aveAdmin && <ContactBlock label="Ave $ Admin" contact={aveAdmin} />}
          </div>
          {logoDomain && <SchoolLogo domain={logoDomain} schoolName={schoolName} />}
        </div>
      )}
    </div>
  );
}
