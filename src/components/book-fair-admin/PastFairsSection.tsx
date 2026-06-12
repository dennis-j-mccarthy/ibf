import { formatRangeET } from '@/lib/book-fair-admin/dates';
import HeaderIcon from './HeaderIcon';

export interface PastFairItem {
  id: number;
  startDate: string;
  endDate: string;
  // null when HubSpot was unreachable or the deal had no value
  totalSalesDisplay: string | null;
  totalItemsSold: string | null;
  hubspotUnavailable: boolean;
  aveDollarsEarned: number;
  aveDollarsSpent: number;
  // false → the spend heuristic was uncertain, label as "activity"
  spendIsCertain: boolean;
}

export default function PastFairsSection({ items }: { items: PastFairItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-[#c0dac7] rounded-xl shadow-sm p-6">
      <h3
        className="flex items-center gap-2.5 text-[#02176f] text-xl font-semibold mb-[30px]!"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        <HeaderIcon name="pastfairs" />
        Past fairs
      </h3>
      <ul className="space-y-4">
        {items.map((fair) => (
          <li key={fair.id} className="bg-white border border-[#dddddd] rounded-lg p-4 shadow-sm">
            <p className="font-semibold text-[#1a1b1f] mb-2">
              {formatRangeET(fair.startDate, fair.endDate)}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[#7e828f]">Total sales</dt>
                <dd className="font-semibold text-[#1a1b1f]">
                  {fair.totalSalesDisplay ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[#7e828f]">Items sold</dt>
                <dd className="font-semibold text-[#1a1b1f]">{fair.totalItemsSold ?? '—'}</dd>
              </div>
            </dl>
            {fair.hubspotUnavailable && (
              <p className="text-xs text-[#7e828f] mt-2">
                Earnings temporarily unavailable — showing local figures only.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
