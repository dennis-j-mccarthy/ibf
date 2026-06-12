import { FAIR_STATUS_STEPS } from '@/lib/book-fair-admin/fair-status';

// Horizontal progress stepper for the fair journey. Steps before `currentStep`
// show a green check, the current step is highlighted, later steps are faded.
export default function FairStatusStepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="mt-6 pt-5 border-t border-white/15">
      <p className="text-xs uppercase tracking-wide text-white/50 mb-3">Fair status</p>
      <ol className="flex items-start">
        {FAIR_STATUS_STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < currentStep;
          const current = n === currentStep;
          const last = i === FAIR_STATUS_STEPS.length - 1;
          return (
            <li key={label} className={`flex items-start ${last ? '' : 'flex-1'}`}>
              <div className="flex flex-col items-center text-center w-16 flex-shrink-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    done
                      ? 'bg-[#50db92] text-[#02176f]'
                      : current
                        ? 'bg-[#ffd41d] text-[#02176f] ring-4 ring-[#ffd41d]/25'
                        : 'bg-white/15 text-white/50'
                  }`}
                >
                  {done ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    n
                  )}
                </span>
                <span
                  className={`mt-1.5 text-[11px] leading-tight ${
                    current ? 'text-white font-semibold' : 'text-white/60'
                  }`}
                >
                  {label}
                </span>
              </div>
              {!last && (
                <span
                  className={`h-0.5 flex-1 mt-3 -mx-2 rounded ${done ? 'bg-[#50db92]' : 'bg-white/15'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
