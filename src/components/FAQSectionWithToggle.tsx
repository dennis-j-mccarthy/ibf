'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface FAQSectionWithToggleProps {
  catholicFaqs: FAQ[];
  publicFaqs: FAQ[];
  showToggle?: boolean;
  initialOpenIndex?: number | null;
}

export default function FAQSectionWithToggle({ catholicFaqs, publicFaqs, showToggle = true, initialOpenIndex = null }: FAQSectionWithToggleProps) {
  const [isCatholic, setIsCatholic] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(initialOpenIndex);

  const faqs = isCatholic ? catholicFaqs : publicFaqs;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleVersionToggle = (catholic: boolean) => {
    setIsCatholic(catholic);
    setOpenIndex(null); // Reset open accordion when switching
  };

  return (
    <section 
      className="py-20"
      style={{
        backgroundImage: "url('/images/OrangeGreenBlobs.png')",
        backgroundPosition: '0 0',
        backgroundSize: 'cover',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <h2 
            className="text-4xl md:text-5xl font-black leading-tight"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            <span className="text-[#0088ff]">FREQUENTLY</span>{' '}
            <span className="text-[#f29500]">ASKED</span>
            <br />
            <span className="text-[#f29500]">QUESTIONS</span>
          </h2>
          <Image
            src="/images/doodad-yellow.png"
            alt=""
            width={81}
            height={20}
            className="inline-block mt-2"
          />
        </div>

        {/* Toggle */}
        {showToggle && (
          <div className="flex justify-center mb-8">
            <div 
              className="inline-flex rounded-full p-1 bg-white shadow-md"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              <button
                onClick={() => handleVersionToggle(true)}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase transition-all ${
                  isCatholic 
                    ? 'bg-[#0088ff] text-white' 
                    : 'bg-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Catholic
              </button>
              <button
                onClick={() => handleVersionToggle(false)}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase transition-all ${
                  !isCatholic 
                    ? 'bg-[#0088ff] text-white' 
                    : 'bg-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                Public
              </button>
            </div>
          </div>
        )}

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <p className="text-gray-500" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                No FAQs available for this category.
              </p>
            </div>
          ) : (
            faqs.map((faq, index) => (
              <div
                key={faq.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  <span className="font-semibold text-[#02176f] text-base">
                    {faq.question}
                  </span>
                  <svg
                    className={`w-5 h-5 text-[#02176f] transform transition-transform flex-shrink-0 ml-4 ${
                      openIndex === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-5">
                    <div 
                      className="text-gray-600 text-base leading-relaxed"
                      style={{ fontFamily: 'brother-1816, sans-serif' }}
                      dangerouslySetInnerHTML={{ __html: faq.answer }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Link
            href="/faqs"
            className="inline-block bg-[#f29500] text-white font-bold uppercase px-8 py-3 rounded hover:bg-[#d98600] transition-colors text-sm tracking-wide"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            VIEW ALL FAQ&apos;S
          </Link>
        </div>
      </div>
    </section>
  );
}
