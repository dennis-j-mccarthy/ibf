'use client';

import Link from 'next/link';
import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'Find a Book Fair Near You!',
    answer: 'Check our events page to find upcoming Ignatius Book Fairs in your area.',
  },
  {
    question: 'Why did Ave Maria University and Ignatius Press start book fairs?',
    answer: 'Ave Maria University and Ignatius Press have launched book fairs to offer an unparalleled Christian alternative to other nationally known book fairs. Our goal is to ensure that children have access to literature that can shape their minds and nourish their souls in the most profound way possible.',
  },
  {
    question: "What's the process if I want to host a book fair?",
    answer: 'To host a book fair, please complete an inquiry form. You will then be contacted by a Book Fair Pro who will provide more information and answer any questions you have.',
  },
  {
    question: 'Where can a fair be hosted?',
    answer: 'Ignatius Book Fairs are now available for schools and parishes across the continental United States! If you are interested in hosting a book fair, please fill out an inquiry form and tell us more about your school or parish.',
  },
  {
    question: 'Are your book fairs in-person?',
    answer: 'Yes! We are thrilled to offer a full-service, in-person book fair experience that will captivate the hearts and minds of children, parents, and teachers alike.',
  },
];

const HomeFAQs = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 
            className="text-3xl md:text-4xl lg:text-5xl uppercase tracking-tight"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            <span className="text-[#f29500]">FREQUENTLY </span>
            <span className="text-[#ff6445]">ASKED</span>
            <br />
            <span className="text-[#ff6445]">QUESTIONS</span>
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index}>
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex justify-between items-center px-6 py-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-left"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                <span className="pr-4 font-medium text-gray-800">
                  {faq.question}
                </span>
                <svg
                  className={`w-5 h-5 text-[#0088ff] flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M3 5.5L8 10.5L13 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {openIndex === index && (
                <div className="bg-white px-6 py-4 border-l-4 border-[#0088ff]">
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-10">
          <Link 
            href="/faqs" 
            className="inline-block bg-[#ff8946] text-white font-bold uppercase px-8 py-4 rounded-lg hover:bg-[#e5753d] transition-colors tracking-wide"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            VIEW ALL FAQ&apos;S
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeFAQs;
