import Image from 'next/image';

const HomeHero = () => {
  return (
    <section className="relative overflow-hidden min-h-[300px] sm:min-h-[400px] md:min-h-[500px]">
      {/* Full background image */}
      <Image
        src="/images/image_no_watermark.png"
        alt="Ignatius Book Fairs hero"
        fill
        className="object-cover"
        priority
      />
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12 md:px-16 lg:px-20">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-5xl w-full">
          {/* Left column - text content */}
          <div className="text-center md:text-left">
            <p 
              className="text-white text-[12px] sm:text-[14px] md:text-[15px] font-bold uppercase tracking-wide mb-2"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Wholesome, Curated, Parent-Approved
            </p>
            <h1 
              className="text-white"
              style={{ fontFamily: 'brother-1816, sans-serif', fontSize: '60px', fontWeight: 800, lineHeight: '104%' }}
            >
              Welcome to<br />Ignatius Book Fairs
            </h1>
          </div>
          
          {/* Right column blob overlay - hidden on mobile */}
          <div className="hidden md:flex items-center">
            <Image
              src="/images/blob_no_bg.png"
              alt=""
              width={400}
              height={340}
              className="h-auto w-[350px] lg:w-[400px] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
