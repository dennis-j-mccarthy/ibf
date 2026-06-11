import { daysUntil, formatRangeET } from '@/lib/book-fair-admin/dates';

interface Props {
  schoolName: string;
  startDate: string;
  endDate: string;
  // null = HubSpot unavailable, omit the badge entirely
  isVirtual: boolean | null;
}

export default function FairHeaderCard({ schoolName, startDate, endDate, isVirtual }: Props) {
  const days = daysUntil(startDate);

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
          <p className="text-white/90">{formatRangeET(startDate, endDate)}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {isVirtual !== null && (
            <span className="inline-block bg-[#0088ff] text-white text-xs font-semibold uppercase tracking-wide rounded-full px-3 py-1">
              {isVirtual ? 'Virtual' : 'In-person'}
            </span>
          )}
          {countdown && (
            <p className="text-[#ffd41d] font-semibold text-lg whitespace-nowrap">{countdown}</p>
          )}
        </div>
      </div>
    </div>
  );
}
