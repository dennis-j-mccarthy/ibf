'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const faqs = [
  {
    question: 'Find a Book Fair Near You!',
    answer: 'Contact us to find out about upcoming book fairs in your area or inquire about hosting one at your school or parish.',
  },
  {
    question: 'Why did Ave Maria University and Ignatius Press start book fairs?',
    answer: 'Ave Maria University and Ignatius Press partnered to create Ignatius Book Fairs to provide schools and parishes with access to quality literature that aligns with Christian values. In a landscape dominated by mainstream distributors, we offer an alternative that ensures children discover books that edify their minds, shape their character, and deepen their faith.',
  },
  {
    question: 'What\'s the process if I want to host a book fair?',
    answer: 'It\'s simple! Submit a request form on our website, and one of our Book Fair Pros will contact you to discuss the details. We\'ll help you choose dates, prepare materials, and ensure your fair is a success.',
  },
  {
    question: 'Where can a fair be hosted?',
    answer: 'Book fairs can be hosted at Catholic schools, Christian schools, public schools, charter schools, parishes, homeschool groups, and other organizations. We work with any group that wants to provide quality literature to their community.',
  },
  {
    question: 'Are your book fairs in-person?',
    answer: 'Yes, we offer in-person book fairs where we ship books to your location. We also offer virtual book fair options for smaller organizations or those who prefer an online experience.',
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
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
        <div className="text-center mb-12 relative">
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

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
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
};

export default FAQSection;
