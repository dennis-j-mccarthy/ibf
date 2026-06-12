import type { Rep } from '@/lib/book-fair-admin/reps';

export default function RepCard({ rep, flat = false }: { rep: Rep; flat?: boolean }) {
  const name = `${rep.firstName} ${rep.lastName}`;
  const initials = `${rep.firstName[0] ?? ''}${rep.lastName[0] ?? ''}`;

  return (
    <section
      className={`flex flex-col h-full rounded-xl ${
        flat ? 'bg-[#f8f9fc] border border-[#eef0f5] p-5' : 'bg-white shadow-sm p-6'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-[#7e828f] mb-3">Your Ignatius rep</p>
      <div className="flex items-center gap-3 mb-3">
        {rep.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={rep.photo}
            alt={name}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full bg-[#02176f] text-white flex items-center justify-center font-bold text-lg flex-shrink-0"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[#02176f]">{name}</p>
          <a
            href={`mailto:${rep.email}`}
            className="text-sm text-[#0088ff] hover:underline break-all"
          >
            {rep.email}
          </a>
        </div>
      </div>
      <p className="text-sm text-[#7e828f] mb-4">
        {rep.firstName} is your go-to for planning, promotion, and anything that comes up before,
        during, or after your fair. Reach out anytime.
      </p>
      <a
        href={rep.bookingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto block text-center bg-[#0088ff] hover:bg-[#0070d8] text-white font-semibold rounded-full py-2.5 px-5 transition-colors"
      >
        Book a call with {rep.firstName}
      </a>
    </section>
  );
}
