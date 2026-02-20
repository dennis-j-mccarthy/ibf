'use client';

import Image from 'next/image';

const WhyHost = () => {
  return (
    <section
      className="relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/images/Orange_Blob.png')", minHeight: '500px' }}
    >
      {/* Loupio Image - absolutely pinned to bottom-left, 95% of section height */}
      <div className="absolute bottom-0 left-0 w-1/2 hidden md:flex justify-center items-end" style={{ height: '80%' }}>
        <Image
          src="/images/LoupioOrange.png"
          alt="Loupio character"
          width={500}
          height={650}
          className="h-full w-auto object-contain object-bottom"
        />
      </div>

      <div className="relative max-w-6xl mx-auto px-4" style={{ paddingTop: 'calc(3rem + 40px)', paddingBottom: 'calc(4rem + 40px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Spacer for the absolutely positioned image on desktop */}
          <div className="hidden md:block" />

          {/* Mobile-only image */}
          <div className="flex justify-center md:hidden">
            <Image
              src="/images/LoupioOrange.png"
              alt="Loupio character"
              width={350}
              height={450}
              className="w-[60%] max-w-[280px] h-auto"
            />
          </div>

          {/* Content */}
          <div className="text-center pb-8 md:pb-12">
            <h2
              className="text-[#f29500] text-3xl md:text-4xl lg:text-5xl font-black uppercase"
              style={{ fontFamily: 'brother-1816, sans-serif', lineHeight: '0.95', margin: 0 }}
            >
              WHY HOST AN
            </h2>
            <h2
              className="text-[#50db92] text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-6"
              style={{ fontFamily: 'brother-1816, sans-serif', lineHeight: '0.95', marginTop: 0 }}
            >
              IGNATIUS BOOK FAIR?
            </h2>
            <p
              className="text-[#546285] text-base md:text-lg max-w-md mx-auto mb-8 leading-relaxed text-center px-8"
            >
              Help ensure that children have access to literature that can inspire their hearts and minds.
            </p>
            <div className="text-center">
              <a
                href="#signup"
                className="inline-block bg-[#f29500] text-white font-bold uppercase px-8 py-4 rounded-lg hover:bg-[#d98500] transition-colors tracking-wide"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                READY?
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyHost;
