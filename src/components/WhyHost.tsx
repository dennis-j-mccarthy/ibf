'use client';

import Image from 'next/image';

const WhyHost = () => {
  return (
    <section 
      className="relative overflow-hidden bg-cover bg-center min-h-[400px] md:min-h-[450px]"
      style={{ backgroundImage: "url('/images/Orange_Blob.png')" }}
    >
      <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* Loupio Image - pinned to bottom */}
          <div className="flex justify-center md:justify-start order-2 md:order-1 self-end">
            <Image
              src="/images/LoupioOrange.png"
              alt="Loupio character"
              width={350}
              height={450}
              className="w-[60%] max-w-[280px] md:max-w-[350px] h-auto"
            />
          </div>

          {/* Content */}
          <div className="order-1 md:order-2 text-center pb-8 md:pb-12">
            <h2 
              className="text-[#f29500] text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-0"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              WHY HOST AN
            </h2>
            <h2 
              className="text-[#50db92] text-3xl md:text-4xl lg:text-5xl font-black uppercase mb-6"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
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
