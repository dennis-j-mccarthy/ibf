'use client';

import { useState } from 'react';

interface FAQ {
  id: number;
  question: string;
  answer: string;
}

interface FAQAccordionProps {
  faqs: FAQ[];
}

export default function FAQAccordion({ faqs }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {faqs.map((faq, index) => (
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
              <p 
                className="text-gray-600 text-base leading-relaxed"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                {faq.answer}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
