'use client';

import Image from 'next/image';
import { useVersion } from '@/contexts/VersionContext';

const HomeHero = () => {
  const { isCatholic } = useVersion();

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

      {/* Color overlay - yellow for Catholic, blue for Public */}
      <div className={`absolute inset-0 transition-colors duration-500 ${isCatholic ? 'bg-[#ffd41d]/70' : 'bg-[#0088ff]'}`} />

      {/* Public mode doodles */}
      {!isCatholic && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Squiggly lines */}
          <svg className="absolute top-[8%] left-[5%] w-32 h-16 opacity-20 animate-[drift1_12s_ease-in-out_infinite]" viewBox="0 0 120 40" fill="none">
            <path d="M5 20 Q15 5 25 20 Q35 35 45 20 Q55 5 65 20 Q75 35 85 20 Q95 5 105 20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <svg className="absolute bottom-[15%] right-[8%] w-40 h-16 opacity-15 animate-[drift2_16s_ease-in-out_infinite]" viewBox="0 0 120 40" fill="none">
            <path d="M5 20 Q15 5 25 20 Q35 35 45 20 Q55 5 65 20 Q75 35 85 20 Q95 5 105 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <svg className="absolute top-[55%] left-[12%] w-24 h-12 opacity-10 animate-[drift3_14s_ease-in-out_infinite]" viewBox="0 0 120 40" fill="none">
            <path d="M5 20 Q20 0 35 20 Q50 40 65 20 Q80 0 95 20 Q110 40 115 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {/* Circles */}
          <div className="absolute top-[12%] right-[15%] w-28 h-28 rounded-full border-[3px] border-white/20 animate-[float1_10s_ease-in-out_infinite]" />
          <div className="absolute bottom-[20%] left-[8%] w-20 h-20 rounded-full border-2 border-white/15 animate-[float2_13s_ease-in-out_infinite]" />
          <div className="absolute top-[40%] right-[4%] w-16 h-16 rounded-full border-2 border-white/15 animate-[float3_9s_ease-in-out_infinite]" />
          <div className="absolute bottom-[35%] left-[25%] w-20 h-20 rounded-full border-2 border-white/12 animate-[float1_11s_ease-in-out_infinite]" />

          {/* Dots */}
          <div className="absolute top-[25%] left-[20%] w-3 h-3 rounded-full bg-white/20 animate-[float2_8s_ease-in-out_infinite]" />
          <div className="absolute top-[65%] right-[20%] w-4 h-4 rounded-full bg-white/15 animate-[float3_11s_ease-in-out_infinite]" />
          <div className="absolute bottom-[10%] left-[45%] w-3 h-3 rounded-full bg-white/20 animate-[float1_7s_ease-in-out_infinite]" />

          {/* Stars / sparkles */}
          <svg className="absolute top-[18%] right-[30%] w-8 h-8 opacity-20 animate-[float2_9s_ease-in-out_infinite]" viewBox="0 0 24 24" fill="white">
            <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
          </svg>
          <svg className="absolute bottom-[25%] left-[35%] w-6 h-6 opacity-15 animate-[float3_12s_ease-in-out_infinite]" viewBox="0 0 24 24" fill="white">
            <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
          </svg>

          {/* Plus signs */}
          <svg className="absolute top-[45%] left-[3%] w-6 h-6 opacity-15 animate-[drift1_10s_ease-in-out_infinite]" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" fill="none">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <svg className="absolute bottom-[12%] right-[25%] w-5 h-5 opacity-20 animate-[drift2_8s_ease-in-out_infinite]" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5" fill="none">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>

          {/* Zigzag */}
          <svg className="absolute top-[70%] right-[12%] w-20 h-8 opacity-12 animate-[drift3_15s_ease-in-out_infinite]" viewBox="0 0 80 20" fill="none">
            <path d="M2 18 L12 2 L22 18 L32 2 L42 18 L52 2 L62 18 L72 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}

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
              src={isCatholic ? "/images/blob-cath-t2.png" : "/images/blob_no_bg.png"}
              alt=""
              width={isCatholic ? 679 : 400}
              height={isCatholic ? 679 : 340}
              className="h-auto w-[350px] lg:w-[400px] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;
