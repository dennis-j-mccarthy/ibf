'use client';

import { useState } from 'react';
import type { FAQ as PrismaFAQ } from '@prisma/client';

type FAQ = Pick<PrismaFAQ, 'id' | 'question' | 'answer' | 'pageTitle'>;

interface FAQsPageContentProps {
  catholicFaqs: FAQ[];
  publicFaqs: FAQ[];
}

// Group FAQs by pageTitle
function groupByPageTitle(faqs: FAQ[]): Record<string, FAQ[]> {
  return faqs.reduce((acc, faq) => {
    const title = faq.pageTitle || 'General';
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);
}

// Clean up category titles for display
function formatCategoryTitle(pageTitle: string): string {
  return pageTitle
    .replace('FAQs ', '')
    .replace('FAQs', '')
    .trim() || 'General';
}

export default function FAQsPageContent({ catholicFaqs, publicFaqs }: FAQsPageContentProps) {
  const [isCatholic, setIsCatholic] = useState(true);
  const [openIndices, setOpenIndices] = useState<Record<string, number | null>>({});

  const faqs = isCatholic ? catholicFaqs : publicFaqs;
  const groupedFaqs = groupByPageTitle(faqs);

  const toggleFAQ = (category: string, index: number) => {
    setOpenIndices((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const handleVersionToggle = (catholic: boolean) => {
    setIsCatholic(catholic);
    setOpenIndices({}); // Reset open accordions when switching
  };

  // Define category order
  const categoryOrder = [
    'Turning the Page',
    'Flow of the Fair',
    'Literature Logistics',
    'Reader Rewards',
    'Your Concerns Our Commitments',
  ];

  // Sort categories
  const sortedCategories = Object.keys(groupedFaqs).sort((a, b) => {
    const aTitle = formatCategoryTitle(a);
    const bTitle = formatCategoryTitle(b);
    const aIndex = categoryOrder.indexOf(aTitle);
    const bIndex = categoryOrder.indexOf(bTitle);
    if (aIndex === -1 && bIndex === -1) return aTitle.localeCompare(bTitle);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <>
      {/* Hero Section */}
      <section 
        className="text-white py-20"
        style={{
          backgroundImage: "url('/images/OrangeGreenBlobs.png')",
          backgroundPosition: '0 0',
          backgroundSize: 'cover',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 
            className="text-4xl md:text-5xl font-black mb-6"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            <span className="text-[#0088ff]">FREQUENTLY</span>{' '}
            <span className="text-[#f29500]">ASKED QUESTIONS</span>
          </h1>
          <p 
            className="text-xl text-gray-700 max-w-3xl mx-auto"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Want to organize a book fair? You&apos;re in the right place! Our FAQ provides essential 
            tips and guidance for initiating, starting, and managing a successful book fair.
          </p>
        </div>
      </section>

      {/* Toggle */}
      <div className="bg-white py-6">
        <div className="flex justify-center">
          <div 
            className="inline-flex rounded-full p-1 bg-gray-100 shadow-md"
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
      </div>

      {/* FAQ Content */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {sortedCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                No FAQs available for this category.
              </p>
            </div>
          ) : (
            sortedCategories.map((category) => (
              <div key={category} className="mb-12">
                <h2 
                  className="text-2xl font-bold text-[#0088ff] mb-6 pb-2 border-b-2 border-[#f29500]"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  {formatCategoryTitle(category)}
                </h2>
                <div className="space-y-4">
                  {groupedFaqs[category].map((faq, index) => (
                    <div
                      key={faq.id}
                      className="bg-gray-50 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFAQ(category, index)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                        style={{ fontFamily: 'brother-1816, sans-serif' }}
                      >
                        <span className="font-semibold text-gray-800 pr-4">
                          {faq.question}
                        </span>
                        <svg
                          className={`w-5 h-5 text-[#0088ff] flex-shrink-0 transition-transform duration-200 ${
                            openIndices[category] === index ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {openIndices[category] === index && (
                        <div className="px-6 pb-4">
                          <div 
                            className="text-gray-600 leading-relaxed"
                            style={{ fontFamily: 'brother-1816, sans-serif' }}
                            dangerouslySetInnerHTML={{ __html: faq.answer }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
