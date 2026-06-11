export type TaxCertStatus = 'complete' | 'missing' | 'unavailable';

interface Props {
  taxCertStatus: TaxCertStatus;
  classroomCount: number;
  invitedCount: number;
  activeTeacherCount: number;
}

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#50db92] text-white flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#dddddd]" />;
}

function DisabledCheckbox({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3 opacity-50" title="Coming soon">
      <span className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-[#dddddd] bg-[#f5f5f5]" />
      <span className="text-[#1a1b1f]">{label}</span>
      <span className="text-xs text-[#7e828f] bg-[#f5f5f5] border border-[#dddddd] rounded-full px-2 py-0.5">
        Coming soon
      </span>
    </li>
  );
}

// Self-reported items are a deferred feature: rendered disabled, no persistence.
const SELF_REPORTED_ITEMS = ['Reviewed catalog', 'Assigned lead teacher', 'Promoted to families'];

export default function PrepChecklist({
  taxCertStatus,
  classroomCount,
  invitedCount,
  activeTeacherCount,
}: Props) {
  return (
    <section className="bg-white rounded-xl shadow-sm p-6">
      <h3
        className="text-[#02176f] text-xl font-semibold mb-4"
        style={{ fontFamily: 'brother-1816, sans-serif' }}
      >
        Prep checklist
      </h3>

      {taxCertStatus === 'missing' && (
        <div className="mb-4 bg-[#ff6445]/10 border border-[#ff6445] rounded-lg px-4 py-3">
          <p className="text-[#1a1b1f] font-semibold">Tax exempt certificate missing</p>
          <p className="text-sm text-[#1a1b1f] mt-1">
            Contact your fair manager to get this resolved before your fair.
          </p>
          <button
            disabled
            title="Coming soon"
            className="mt-2 text-sm font-semibold text-white bg-[#7e828f] rounded-md px-3 py-1.5 cursor-not-allowed opacity-70"
          >
            Upload certificate (coming soon)
          </button>
        </div>
      )}

      <ul className="space-y-3">
        <li className="flex items-center gap-3">
          <CheckIcon done />
          <span className="text-[#1a1b1f]">Contract signed</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckIcon done={taxCertStatus === 'complete'} />
          <span className="text-[#1a1b1f]">Tax exempt certificate</span>
          {taxCertStatus === 'unavailable' && (
            <span className="text-xs text-[#7e828f]">status temporarily unavailable</span>
          )}
        </li>
        <li className="flex items-center gap-3">
          <CheckIcon done={classroomCount >= 1} />
          <span className="text-[#1a1b1f]">
            Classrooms created{' '}
            <span className="text-[#7e828f]">({classroomCount})</span>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <CheckIcon done={classroomCount > 0 && invitedCount === classroomCount} />
          <span className="text-[#1a1b1f]">
            Teachers invited{' '}
            <span className="text-[#7e828f]">
              ({invitedCount} of {classroomCount} classrooms)
            </span>
          </span>
        </li>
        <li className="flex items-center gap-3">
          <CheckIcon done={invitedCount > 0 && activeTeacherCount === invitedCount} />
          <span className="text-[#1a1b1f]">
            Teachers active{' '}
            <span className="text-[#7e828f]">
              ({activeTeacherCount} of {invitedCount} invited)
            </span>
          </span>
        </li>
        {SELF_REPORTED_ITEMS.map((label) => (
          <DisabledCheckbox key={label} label={label} />
        ))}
      </ul>
    </section>
  );
}
