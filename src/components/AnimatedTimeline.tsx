'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const timelineData = [
  {
    year: '1978',
    color: '#f29500',
    image: '/images/FoundingofIP.png',
    text: 'Ignatius Press is founded, marking the beginning of our journey to enrich the lives of young people, through literature.',
    side: 'left',
  },
  {
    year: '2003',
    color: '#0088ff',
    image: '/images/Establishment-AMU.png',
    text: 'Ave Maria University is established, offering the best in Catholic liberal arts education to students at our southwestern Florida campus.',
    side: 'right',
  },
  {
    year: '2015',
    color: '#ff6445',
    image: '/images/FirstPartnership.png',
    text: 'Ignatius Press partners with the Augustine Institute, marking a significant moment of growth and expansion in vision.',
    side: 'left',
  },
  {
    year: '2023',
    color: '#50db92',
    image: '/images/TheCollaboration-Badge.png',
    text: 'Ignatius Press and Ave Maria University come together to create Ignatius Book Fairs, a new chapter in the story.',
    side: 'right',
  },
  {
    year: '2025',
    color: '#f29500',
    image: '/images/IntroductionofBookClub.png',
    text: 'The introduction of the Book Club is set to expand our impact, reaching more readers and communities.',
    side: 'left',
  },
];

interface TimelineItemProps {
  item: typeof timelineData[0];
  index: number;
}

function TimelineItem({ item, index }: TimelineItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  const translateX = item.side === 'left' ? '-60px' : '60px';

  return (
    <div 
      ref={ref}
      className={`relative flex flex-col md:flex-row items-center gap-4 md:gap-8 ${
        item.side === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
      style={{
        opacity: isVisible ? 1 : 0.15,
        transform: isVisible ? 'translateX(0)' : `translateX(${translateX})`,
        transition: `opacity 0.8s ease-out ${index * 0.1}s, transform 0.8s ease-out ${index * 0.1}s`,
      }}
    >
      {/* Content Side */}
      <div className={`flex-1 ${item.side === 'left' ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
        <div className={`flex items-center gap-4 mb-3 ${item.side === 'left' ? 'md:justify-end' : 'md:justify-start'}`}>
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
            <Image 
              src={item.image} 
              alt={item.year} 
              width={96} 
              height={96} 
              className="w-full h-full object-cover" 
            />
          </div>
          <span 
            className="text-4xl md:text-5xl lg:text-6xl font-bold"
            style={{ color: item.color }}
          >
            {item.year}
          </span>
        </div>
        <p className="text-gray-700 max-w-md inline-block">{item.text}</p>
      </div>

      {/* Empty space for the other side */}
      <div className="flex-1 hidden md:block" />
    </div>
  );
}

function BeyondSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div 
      ref={ref}
      className="relative pt-8"
      style={{
        opacity: isVisible ? 1 : 0.15,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
      }}
    >
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 md:text-right md:pr-12">
          <h3 className="mb-4">
            <span className="text-4xl md:text-5xl font-bold text-[#0088ff]">2025 </span>
            <span className="font-handsome text-4xl md:text-5xl text-[#50db92]">and beyond</span>
          </h3>
          <p className="text-gray-700 max-w-md inline-block">
            Our vision includes bringing the Book Fair and Club to a wider audience, 
            encompassing parishes, public and charter schools, and other diverse groups, 
            both young and old.
          </p>
        </div>
        <div className="flex-1 hidden md:block" />
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden shadow-lg md:absolute md:right-[280px] lg:right-[320px]">
          <Image 
            src="/images/Young-and-Old.png" 
            alt="Young and Old" 
            width={160} 
            height={160} 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
    </div>
  );
}

export default function AnimatedTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loupioTop, setLoupioTop] = useState(0);
  const animationRef = useRef<number | null>(null);
  const targetTopRef = useRef(0);
  const currentTopRef = useRef(0);

  useEffect(() => {
    // Smooth animation loop
    const animate = () => {
      const diff = targetTopRef.current - currentTopRef.current;
      // Ease towards target (0.08 = smooth, higher = faster)
      currentTopRef.current += diff * 0.08;
      setLoupioTop(currentTopRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);

    const handleScroll = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerTop = rect.top;
      const containerHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calculate how far we've scrolled through the timeline
      // Start sooner (0.5 = start when timeline is halfway up the screen)
      const startOffset = windowHeight * 0.5;
      const scrollStart = -containerTop + startOffset;
      // End later (0.3 = finish when 30% from bottom)
      const scrollEnd = containerHeight - windowHeight * 0.3;
      
      let progress = scrollStart / scrollEnd;
      progress = Math.max(0, Math.min(1, progress));
      
      // Set target position for smooth animation
      targetTopRef.current = progress * (containerHeight - 80);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <section className="bg-white py-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-left mb-16">
          <p className="font-handsome text-3xl md:text-4xl text-[#ff6445] mb-0">Ignatius Book Fairs</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0088ff] uppercase">A Journey Through Time</h2>
            <Image src="/images/green-circles.png" alt="" width={60} height={60} className="hidden md:block" />
          </div>
        </div>

        {/* Timeline Container */}
        <div ref={containerRef} className="relative">
          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 -translate-x-1/2 hidden md:block" />

          {/* Animated Loupio */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 z-20 hidden md:block"
            style={{ top: `${loupioTop}px` }}
          >
            <div className="w-16 h-16 rounded-full bg-[#ffd41d] shadow-lg flex items-center justify-center border-4 border-white">
              <Image 
                src="/images/Loupio.png" 
                alt="Loupio" 
                width={48} 
                height={48} 
                className="object-contain"
              />
            </div>
          </div>

          {/* Timeline Items */}
          <div className="space-y-8 md:space-y-12">
            {timelineData.map((item, index) => (
              <TimelineItem key={item.year} item={item} index={index} />
            ))}

            {/* 2025 and beyond - special treatment */}
            <BeyondSection />
          </div>
        </div>
      </div>
    </section>
  );
}
