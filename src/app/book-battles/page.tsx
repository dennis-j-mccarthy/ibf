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

        <div className="w-full">
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
          className="text-center text-[#02176f]/60 text-lg mt-6"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Watch the Video (click for sound)
        </p>
      </div>
    </div>
  );
}
