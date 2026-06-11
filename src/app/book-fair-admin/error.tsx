'use client';

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="bg-[#f5f5f5] min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm p-8 text-center max-w-md">
        <h2
          className="text-[#02176f] text-xl font-semibold mb-2"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Something went wrong
        </h2>
        <p className="text-[#7e828f] mb-4">
          We couldn&apos;t load your dashboard. Please try again, or call{' '}
          <a href="tel:888-771-2321" className="text-[#0088ff] hover:underline">
            888-771-2321
          </a>{' '}
          if it keeps happening.
        </p>
        <button
          onClick={reset}
          className="bg-[#02176f] hover:bg-[#021a85] text-white font-semibold px-4 py-2 rounded-md transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
