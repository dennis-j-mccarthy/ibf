'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useVersion } from '@/contexts/VersionContext';

interface Testimonial {
  id: number;
  title: string;
  blurb: string;
  type: string;
}

const Testimonials = () => {
  const { version } = useVersion();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestimonials() {
      setLoading(true);
      try {
        const response = await fetch(`/api/testimonials?type=${version}`);
        if (response.ok) {
          const data = await response.json();
          setTestimonials(data);
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      }
      setLoading(false);
    }

    fetchTestimonials();
  }, [version]);

  return (
    <section 
      className="py-16 md:py-24 mt-10"
      style={{
        backgroundImage: "url('/images/Header_Blob01.png')",
        backgroundPosition: '0 0',
        backgroundSize: 'cover',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-[#ff6445] text-3xl md:text-4xl lg:text-5xl font-black uppercase"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            TESTIMONIALS
          </h1>
        </div>

        {/* Testimonials */}
        <div className="space-y-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          {loading ? (
            <p className="text-[#02176f] text-center">Loading testimonials...</p>
          ) : testimonials.length === 0 ? (
            <p className="text-[#02176f] text-center">No testimonials available.</p>
          ) : (
            testimonials.map((testimonial) => (
              <div key={testimonial.id}>
                <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-2">
                  <strong>{testimonial.title}</strong>
                </p>
                <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-4">
                  &ldquo;{testimonial.blurb}&rdquo;
                </p>
              </div>
            ))
          )}
        </div>

        {/* Watch Video Link */}
        <div className="mt-12 flex items-center gap-4">
          <Image
            src="/images/Worksheet-Frame-39977-1.png"
            alt="Video testimonials"
            width={161}
            height={90}
            className="w-[120px] md:w-[161px] h-auto"
          />
          <Link 
            href="#" 
            className="text-[#0088ff] font-semibold hover:underline"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Watch video testimonials for Ignatius Book Fair customers
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
