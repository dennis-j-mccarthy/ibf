'use client';

import { useState } from 'react';
import { Metadata } from 'next';

const faqCategories = [
  {
    title: 'About Us',
    faqs: [
      {
        question: 'Why did Ave Maria and Ignatius Press start a book fair service?',
        answer: 'Ave Maria University and Ignatius Press partnered to create Ignatius Book Fairs to provide schools and parishes with access to quality literature that aligns with Christian values. In a landscape dominated by mainstream distributors, we offer an alternative that ensures children discover books that edify their minds, shape their character, and deepen their faith.',
      },
      {
        question: 'Who is on your team?',
        answer: 'Our team includes dedicated professionals from both Ave Maria University and Ignatius Press, including Book Fair Managers, Book Fair Pros, marketing specialists, and administrative staff who work together to ensure every book fair is a success.',
      },
      {
        question: 'Where are you located?',
        answer: 'We operate from Ave Maria, Florida, home of Ave Maria University, and work with Ignatius Press based in San Francisco, California.',
      },
      {
        question: 'Do you have a mascot?',
        answer: 'Yes! Meet Loupio, our adventurous troubadour from 13th-century Italy. His tales, set in the era of Francis of Assisi, teach about kindness, bravery, and honesty, inspiring virtues of faith, hope, and charity in young readers.',
      },
    ],
  },
  {
    title: 'Hosting a Book Fair',
    faqs: [
      {
        question: 'Where can a book fair be hosted?',
        answer: 'Book fairs can be hosted at Catholic schools, Christian schools, public schools, charter schools, parishes, homeschool groups, and other organizations. We work with any group that wants to provide quality literature to their community.',
      },
      {
        question: 'Is there a cost to hosting a book fair?',
        answer: 'There is no upfront cost to host an Ignatius Book Fair. We ship the books to you at no charge, and you return any unsold items after the fair.',
      },
      {
        question: 'Do you have a minimum book fair sales requirement?',
        answer: 'We work with schools and organizations of all sizes. Contact us to discuss what arrangement works best for your community.',
      },
      {
        question: 'What if my school or parish is too small for an in-person book fair?',
        answer: 'We offer virtual book fair options that are perfect for smaller organizations. Your community can shop online, and you still earn rewards!',
      },
      {
        question: 'How long should my fair run?',
        answer: 'Most book fairs run for 5-7 days, but we can customize the duration based on your needs and schedule.',
      },
      {
        question: 'How do we handle processing payments?',
        answer: 'We provide guidance on payment processing options, including cash, check, and card payments. We\'ll work with you to set up the best system for your fair.',
      },
      {
        question: 'How much does a virtual book fair cost?',
        answer: 'Virtual book fairs have no cost to host. Your organization earns rewards based on the sales generated through your unique fair link.',
      },
      {
        question: 'What\'s the process if I want to host a book fair?',
        answer: 'It\'s simple! Submit a request form on our website, and one of our Book Fair Pros will contact you to discuss the details. We\'ll help you choose dates, prepare materials, and ensure your fair is a success.',
      },
      {
        question: 'Do you have my dates available?',
        answer: 'We schedule book fairs throughout the school year. Contact us early to secure your preferred dates, especially during popular times like Catholic Schools Week.',
      },
      {
        question: 'What if we\'ve never hosted a book fair before?',
        answer: 'No problem! Our Book Fair Pros will guide you through every step of the process. We provide all the materials and support you need for a successful fair.',
      },
      {
        question: 'How are book fair materials shipped and returned?',
        answer: 'We ship all books and materials to your location at no charge using prepaid shipping labels. After your fair, simply repack any unsold items and use the prepaid return label.',
      },
    ],
  },
  {
    title: 'Books & Selection',
    faqs: [
      {
        question: 'How many books do you send to a book fair?',
        answer: 'The number of books depends on your organization\'s size and expected attendance. We typically send 300-1,000+ titles to ensure a great selection for your community.',
      },
      {
        question: 'Do you send only Christian books?',
        answer: 'No, we offer a carefully curated mix of Christian and quality secular books. All titles are reviewed to ensure they align with positive values and are appropriate for young readers.',
      },
      {
        question: 'But you will have Catholic books, right?',
        answer: 'Absolutely! We have an extensive selection of Catholic books, including lives of the saints, First Communion and Confirmation resources, and faith-based children\'s literature.',
      },
      {
        question: 'Do you offer seasonal titles?',
        answer: 'Yes! We include seasonal books for Christmas, Easter, and other special occasions throughout the year.',
      },
      {
        question: 'Can I see the list of books that is sent to the Ignatius Book Fairs?',
        answer: 'Yes, we can provide a book list upon request. Contact your Book Fair Pro for the current catalog.',
      },
      {
        question: 'What ages does the book fair cater to?',
        answer: 'Our book selection caters to kindergarten through 8th grade, with titles appropriate for beginning readers through young adults.',
      },
      {
        question: 'Can we shop for additional books from your website at an in-person book fair?',
        answer: 'Yes! Visitors to your in-person fair can also browse and order from our complete online catalog for items not available at the physical fair.',
      },
    ],
  },
  {
    title: 'Rewards & Ave Dollars',
    faqs: [
      {
        question: 'What are Ave Dollars?',
        answer: 'Ave Dollars are rewards your organization earns based on book fair sales. They can be used to purchase books for your school library or classroom collections from our catalog.',
      },
    ],
  },
  {
    title: 'Changes & Issues',
    faqs: [
      {
        question: 'What if I need to cancel, extend, delay, or change the dates of my book fair?',
        answer: 'Life happens! Contact your Book Fair Pro as soon as possible, and we\'ll work with you to accommodate schedule changes.',
      },
      {
        question: 'What happens if we have an unexpected problem during a book fair?',
        answer: 'Our team is available to help! Contact your Book Fair Pro immediately, and we\'ll work to resolve any issues quickly.',
      },
    ],
  },
];

export default function FAQsPage() {
  const [openIndices, setOpenIndices] = useState<{ [key: string]: number | null }>({});

  const toggleFAQ = (categoryIndex: number, faqIndex: number) => {
    const key = `${categoryIndex}`;
    setOpenIndices((prev) => ({
      ...prev,
      [key]: prev[key] === faqIndex ? null : faqIndex,
    }));
  };

  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--accent)] to-[var(--primary-dark)] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Want to organize a book fair? You&apos;re in the right place! Our FAQ provides essential 
            tips and guidance for initiating, starting, and managing a successful book fair.
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqCategories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-12">
              <h2 className="text-2xl font-bold text-[var(--accent)] mb-6 pb-2 border-b-2 border-[var(--secondary)]">
                {category.title}
              </h2>
              <div className="space-y-4">
                {category.faqs.map((faq, faqIndex) => (
                  <div
                    key={faqIndex}
                    className="bg-[var(--light-bg)] rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(categoryIndex, faqIndex)}
                      className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-[var(--accent)] pr-4">
                        {faq.question}
                      </span>
                      <svg
                        className={`w-5 h-5 text-[var(--primary)] transform transition-transform flex-shrink-0 ${
                          openIndices[`${categoryIndex}`] === faqIndex ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openIndices[`${categoryIndex}`] === faqIndex && (
                      <div className="px-6 pb-5">
                        <p className="text-gray-600">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[var(--primary)] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Still have questions?</h2>
          <p className="text-lg text-gray-200 mb-8">
            Our team is here to help! Contact us and we&apos;ll get back to you as soon as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/#inquiry-form"
              className="bg-white text-[var(--primary)] px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Contact Us
            </a>
            <a
              href="tel:888-771-2321"
              className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-[var(--primary)] transition-colors"
            >
              Call 888-771-2321
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
