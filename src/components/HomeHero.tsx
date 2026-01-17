import Image from 'next/image';

const HomeHero = () => {
  return (
    <section className="relative overflow-hidden min-h-[400px] md:min-h-[500px]">
      {/* Full background image */}
      <Image
        src="/images/image_no_watermark.png"
        alt="Ignatius Book Fairs hero"
        fill
        className="object-cover"
        priority
      />
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex px-12 md:px-20 lg:px-32">
        {/* Left column - text content */}
        <div className="w-1/2 flex flex-col justify-center">
          <p 
            className="text-white text-[15px] font-bold uppercase tracking-wide mb-2"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Wholesome, Curated, Parent-Approved
          </p>
          <h1 
            className="text-white text-[60px] font-black leading-tight"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Welcome to<br />Ignatius Book Fairs
          </h1>
        </div>
        
        {/* Right column blob overlay */}
        <div className="w-1/2 flex items-center justify-end">
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
