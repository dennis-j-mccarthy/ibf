import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Battle Interest Form | Ignatius Book Fairs',
  description:
    'Interested in hosting a Book Battle at your school? Schedule time with our Book Battle coordinator to learn more.',
};

// Kim's booking embed — same as the form-2 response page (SignUpForm.tsx),
// which embeds her HubSpot meeting URL with ?embed=true.
const BOOKING_URL = 'https://meetings.hubspot.com/kneumaier/ignatius-book-fair';

export default function BookBattleInterestFormPage() {
  const hasEmbed = BOOKING_URL.startsWith('http');

  return (
    <div className="min-h-screen bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1
          className="text-[#02176f] text-4xl md:text-5xl lg:text-6xl font-black uppercase mb-6"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Book Battle Interest Form
        </h1>
        <p className="text-[#02176f] text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
          Interested in bringing a Book Battle to your school? Pick a time below to
          connect with our Book Battle coordinator — we&rsquo;ll walk you through how
          it works and help you get started.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {hasEmbed ? (
          <iframe
            src={`${BOOKING_URL}?embed=true`}
            title="Book a meeting"
            className="w-full rounded-xl border border-gray-200"
            style={{ height: '720px' }}
            scrolling="yes"
          />
        ) : (
          <div className="rounded-xl border-2 border-dashed border-[#0088ff] bg-[#eaf5ff] p-10 text-center text-[#02176f]">
            <p className="font-semibold mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              Microsoft Bookings embed goes here
            </p>
            <p className="text-sm text-[#02176f]/70">
              Awaiting Kim&rsquo;s Bookings page URL.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
