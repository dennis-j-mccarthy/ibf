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
      <div className="absolute inset-0 flex flex-col md:flex-row px-6 sm:px-12 md:px-20 lg:px-32">
        {/* Left column - text content */}
        <div className="w-full md:w-1/2 flex flex-col justify-center py-8 md:py-0">
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
        <div className="hidden md:flex w-1/2 items-center justify-end">
          <Image
            src="/images/blob_no_bg.png"
            alt=""
            width={480}
            height={400}
            className="h-[80%] w-auto object-contain"
          />
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
