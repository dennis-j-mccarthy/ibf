'use client';

import Script from 'next/script';

const DiscoverVideo = () => {
  return (
    <section className="relative py-16 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Content */}
          <div className="text-center md:text-left">
            <h2 
              className="text-[#0088ff] text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-1"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              DISCOVER
            </h2>
            <h3 
              className="text-[#ffd41d] text-[35px] mb-6 md:pl-10"
              style={{ fontFamily: "handsome-pro, sans-serif" }}
            >
              Ignatius Book Fairs
            </h3>
            <p className="text-base md:text-lg text-[#02176f] max-w-lg mx-auto md:mx-0 leading-relaxed md:pl-10">
              Discover books that foster creativity, imagination, and wonder — providing easy access to the best in literature for schools, parishes, parents, aligned with Catholic virtues. Books that can edify, shape character, and deepen faith.
            </p>
          </div>

          {/* Wistia Video Player */}
          <div className="flex justify-center items-center">
            <div className="w-full max-w-[600px]">
              <Script src="https://fast.wistia.com/player.js" strategy="lazyOnload" />
              <Script src="https://fast.wistia.com/embed/pl16fxhzoe.js" strategy="lazyOnload" />
              <style jsx>{`
                wistia-player[media-id='pl16fxhzoe']:not(:defined) {
                  background: center / contain no-repeat url('https://fast.wistia.com/embed/medias/pl16fxhzoe/swatch');
                  display: block;
                  filter: blur(5px);
                  padding-top: 56.25%;
                }
              `}</style>
              {/* @ts-expect-error - Wistia custom element */}
              <wistia-player media-id="pl16fxhzoe" aspect="1.7777777777777777"></wistia-player>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DiscoverVideo;
