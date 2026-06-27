import { daysUntil, formatDateET, shiftDays } from '@/lib/book-fair-admin/dates';
import { MARKETING_MILESTONES } from '@/lib/book-fair-admin/marketing-milestones';

interface Props {
  fairStartDate: string;
}

export default function MarketingTimeline({ fairStartDate }: Props) {
  const milestones = MARKETING_MILESTONES.map((m) => {
    const date = shiftDays(fairStartDate, -m.daysBeforeStart);
    return {
      ...m,
      date,
      isPast: date ? (daysUntil(date) ?? 0) < 0 : false,
    };
  });

  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="text-[#02176f] text-xl font-semibold mb-4"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Marketing calendar
      </h3>
      <ol className="relative border-l-2 border-[#dddddd] ml-2 space-y-6">
        {milestones.map((m) => (
          <li key={m.title} className={`pl-5 relative ${m.isPast ? 'opacity-45' : ''}`}>
            <span
              className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${
                m.isPast ? 'bg-[#7e828f]' : 'bg-[#0088ff]'
              }`}
            />
            <p className="text-xs uppercase tracking-wide text-[#7e828f]">
              {m.date ? formatDateET(m.date) : ''}
            </p>
            <p className="font-semibold text-[#1a1b1f]">{m.title}</p>
            <p className="text-sm text-[#7e828f]">{m.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
