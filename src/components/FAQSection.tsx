import Link from 'next/link';
import Image from 'next/image';
import { getFAQs } from '@/lib/data';
import FAQAccordion from './FAQAccordion';

export default async function FAQSection() {
  const faqs = await getFAQs();

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
        <FAQAccordion faqs={faqs} />

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
