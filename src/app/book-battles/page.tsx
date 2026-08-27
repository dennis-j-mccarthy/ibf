import Script from 'next/script';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ignatius Book Battles | Ignatius Book Fairs',
  robots: 'noindex, nofollow',
};

export default function BookBattlesPage() {
  return (
    <div className="min-h-screen bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">
        <h1
          className="text-[#02176f] text-4xl md:text-5xl lg:text-6xl font-black uppercase text-center mb-8"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Ignatius Book Battles
        </h1>

        <p
          className="text-center text-[#02176f] text-base md:text-lg leading-relaxed mb-10 max-w-2xl mx-auto"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          The Ignatius Book Battle encourages students to fall in love with reading through stories that inspire, challenge, and delight. This year&apos;s curated book list blends excellent Catholic titles with outstanding secular literature, giving students a rich and well-rounded reading experience. Schools can purchase all competition titles here in one convenient place.
        </p>

        <div className="w-full mt-[40px]">
          <Script src="https://fast.wistia.com/player.js" strategy="lazyOnload" />
          <Script src="https://fast.wistia.com/embed/x0cm7tqchc.js" strategy="lazyOnload" />
          <style>{`
            wistia-player[media-id='x0cm7tqchc']:not(:defined) {
              background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/x0cm7tqchc/swatch');
              display: block;
              filter: blur(5px);
              padding-top: 56.25%;
            }
          `}</style>
          {/* @ts-expect-error - Wistia custom element */}
          <wistia-player media-id="x0cm7tqchc" aspect="1.7777777777777777"></wistia-player>
        </div>

        <p
          className="text-center text-[#02176f]/60 text-lg mt-[10px]"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Watch the Video (click for sound)
        </p>

        <h2
          className="text-[#02176f] text-3xl md:text-4xl font-black uppercase text-center"
          style={{ fontFamily: 'brother-1816, sans-serif', marginTop: '80px', marginBottom: '40px' }}
        >
          Book Lists
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <a
            href="/documents/4-5-book-battle-6-2.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <img
              src="/images/thumb-book-battle-4-5.png"
              alt="Book Battle 2026-2027 Book List, Grades 4-5"
              className="w-full rounded-lg border border-[#02176f]/10 shadow-md transition-shadow group-hover:shadow-xl"
            />
            <p
              className="text-center text-[#02176f] text-lg font-bold uppercase mt-3 group-hover:underline"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Grades 4-5
            </p>
          </a>

          <a
            href="/documents/6-8-book-battle-6-4.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <img
              src="/images/thumb-book-battle-6-8.png"
              alt="Book Battle 2026-2027 Book List, Grades 6-8"
              className="w-full rounded-lg border border-[#02176f]/10 shadow-md transition-shadow group-hover:shadow-xl"
            />
            <p
              className="text-center text-[#02176f] text-lg font-bold uppercase mt-3 group-hover:underline"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Grades 6-8
            </p>
          </a>
        </div>

        <h2
          className="text-[#02176f] text-3xl md:text-4xl font-black uppercase text-center"
          style={{ fontFamily: 'brother-1816, sans-serif', marginTop: '80px', marginBottom: '40px' }}
        >
          Book Battle Worksheets
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            {
              href: '/documents/ibb-book-summary-sheet.pdf',
              thumb: '/images/thumb-ibb-book-summary-sheet.png',
              title: 'Book Summary Sheet',
            },
            {
              href: '/documents/ibb-round-scoring-sheet.pdf',
              thumb: '/images/thumb-ibb-round-scoring-sheet.png',
              title: 'Round Scoring Sheet',
            },
            {
              href: '/documents/ibb-sportsmanship.pdf',
              thumb: '/images/thumb-ibb-sportsmanship.png',
              title: 'Sportsmanship Warning Form',
            },
            {
              // Lives ONLY here by design -- removed from the Resource table
              // (and therefore the resources page and site search) per the
              // IBB-certificate ClickUp task.
              href: '/documents/ibb-cert-of-participation.pdf',
              thumb: '/images/thumb-ibb-cert-participation.png',
              title: 'Certificate of Participation',
            },
          ].map((sheet) => (
            <a
              key={sheet.href}
              href={sheet.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {/* Fixed-aspect card so the landscape sheet sits evenly beside the portrait ones */}
              <div className="aspect-[4/5] flex items-center justify-center bg-[#f5f7fb] rounded-lg border border-[#02176f]/10 shadow-md transition-shadow group-hover:shadow-xl p-4">
                <img
                  src={sheet.thumb}
                  alt={sheet.title}
                  className="max-h-full max-w-full rounded shadow-sm"
                />
              </div>
              <p
                className="text-center text-[#02176f] text-lg font-bold uppercase mt-3 group-hover:underline"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                {sheet.title}
              </p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
