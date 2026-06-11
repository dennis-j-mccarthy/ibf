import { formatRangeET } from '@/lib/book-fair-admin/dates';

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

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function PastFairsSection({ items }: { items: PastFairItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="text-[#02176f] text-xl font-semibold mb-4"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Past fairs
      </h3>
      <ul className="space-y-4">
        {items.map((fair) => (
          <li key={fair.id} className="border border-[#f0f0f0] rounded-lg p-4">
            <p className="font-semibold text-[#1a1b1f] mb-2">
              {formatRangeET(fair.startDate, fair.endDate)}
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
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
              <div>
                <dt className="text-[#7e828f]">Ave Dollars earned</dt>
                <dd className="font-semibold text-[#1a1b1f]">{money(fair.aveDollarsEarned)}</dd>
              </div>
              <div>
                <dt className="text-[#7e828f]">
                  {fair.spendIsCertain ? 'Ave Dollars spent' : 'Ave Dollars activity'}
                </dt>
                <dd className="font-semibold text-[#1a1b1f]">{money(fair.aveDollarsSpent)}</dd>
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
