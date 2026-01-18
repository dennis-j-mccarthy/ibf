'use client';

import { useState } from 'react';
import Image from 'next/image';

const storyAccordion = [
  { 
    title: 'Inspiration for the Partnership',
    content: `This partnership between Ignatius Press and Ave Maria University was born of a shared desire to provide easy access to the best in Christian literature for schools, parishes, and parents.

"We feel the need for good books in our culture, and we want to provide them in schools for young people but also for parishes, for parents and other Catholics to have easy access to the best in Catholic literature."

- Fr. Joseph Fessio, S. J.`
  },
  { 
    title: 'The Uniqueness of This Collaboration',
    content: `Ave Maria University, known for its commitment to liberal arts education, and Ignatius Press, the leading Catholic publisher in America, are joining forces. Together, they will support schools seeking quality children's literature.

"Ave Maria University has established itself as a university committed to providing a liberal arts curriculum based on Catholic principles and thought. Ignatius Press has a longstanding tradition of being the most popular Catholic publisher in America. Through this new venture, we hope to help form young children with faith-filled literature. We are building these book fairs to be fountainhead of renewal for the Church, for the salvation of souls."

- Mark Middendorf`
  },
  { 
    title: 'The Importance of Our Mission',
    content: `Our partnership is rooted in the shared mission of fostering children's relationship with Jesus and forming them in His love. Recognizing the cultural threat to Christian values, we offer young people wholesome literature to nourish their minds and hearts.

"The attack on the innocence of children has become almost omnipresent, and we wanted to use our resources to provide young people with good, wholesome literature and give them a love for reading. At the same time, we want to provide what no other book fair provides, namely, the best in Christian literature for young people that will form them in ways that they will build upon throughout their life."

- Fr. Joseph Fessio, S. J.`
  },
  { 
    title: 'Why Now is the Time',
    content: `Many dioceses and schools are seeking alternatives to Scholastic, which has declined in its credibility in recent years. Ignatius Press and Ave Maria University provide a trusted book fair experience, equipped with literature consistent with Christian values.

"Scholastic has a venerable history of providing great literature and now is not as trusted a resource as they have been in the past through their newer material. The bishops are now turning to where they can find a trusted resource. Ignatius Press has always been trusted, making it the perfect publisher for Ave Maria University to partner with on this journey of formational revival."

- Mark Middendorf`
  },
  { 
    title: "Defining a 'Good Book'",
    content: `A good book excels in literary quality while also inspiring the mind, moving the heart, and inspiring the Christian to live a life of faith and virtue.

"(A good book) is well written and provides a narrative that engages the reader on a level of artistic goodness. We also believe that good books are written from a perspective of moral rectitude that will form the heart and the mind and help to develop the reader's character."

- Fr. Joseph Fessio, S. J.`
  },
];

export default function OurStoryAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="bg-white py-20">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="font-brother font-bold text-4xl md:text-5xl text-[#0066ff] text-center mb-24 uppercase">Our Story</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column - Photos */}
          <div className="lg:col-span-4 flex flex-row lg:flex-col justify-center items-center gap-8 lg:gap-12">
            <div className="text-center">
              <div className="relative w-40 h-40 md:w-52 md:h-52 mx-auto mb-3">
                <Image src="/images/MarkMiddendorf.png" alt="Mark Middendorf" fill className="object-contain" />
              </div>
              <p className="font-bold text-[#50db92] text-lg">Mark Middendorf</p>
              <p className="text-gray-600 text-sm">President, Ave Maria University</p>
            </div>
            <div className="text-center">
              <div className="relative w-40 h-40 md:w-52 md:h-52 mx-auto mb-3">
                <Image src="/images/Fessio.png" alt="Fr. Joseph Fessio" fill className="object-contain" />
              </div>
              <p className="font-bold text-[#50db92] text-lg">Fr. Joseph Fessio</p>
              <p className="text-gray-600 text-sm">Ignatius Press</p>
            </div>
          </div>

          {/* Right Column - Accordion */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            {storyAccordion.map((item, index) => (
              <div key={index}>
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full bg-[#f29500] text-white px-6 py-4 rounded-lg flex items-center justify-between font-semibold text-left hover:bg-[#e08800] transition-colors shadow-md"
                >
                  <span>{item.title}</span>
                  <span className="text-2xl font-light ml-4">{openIndex === index ? '−' : '+'}</span>
                </button>
                {openIndex === index && (
                  <div className="bg-gray-50 px-6 py-5 rounded-b-lg border border-t-0 border-gray-200 shadow-sm">
                    <p className="text-gray-700 whitespace-pre-line leading-relaxed">{item.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
