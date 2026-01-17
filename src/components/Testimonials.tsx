'use client';

import Image from 'next/image';
import Link from 'next/link';

const testimonials = [
  {
    name: "Sr. Maria Guadalupe Hallee, O.P., the Principal at St. Isaac Jogues School in St. Clair Shores, MI (180 students), hosted an Ignatius Book Fair in February 2024.",
    quote: "We had a great experience with Ignatius Book Fairs! We were looking for a book fair which would provide quality children's books which had been thoroughly vetted, so that we could be confident in allowing our students to browse to find something they would like. The selection of books, the variety of authors and genres, and the assistance we received from the staff of Ignatius Book Fairs led to a very successful event! We raised a generous amount of money for books for our school library, and we received very positive reviews from our librarian, our parents, our teachers, our students, and our parishioners. We are already looking forward to our next Ignatius Book Fair!",
  },
  {
    name: "Joan Hill, Librarian at St. Anthony Catholic School in Columbus, TX (175 students), hosted an Ignatius Book Fair in February 2024.",
    quote: "You gave the best advice to invite our parishioners after the weekend Masses to kick off the fair. Our CCE program is on Wednesday evenings and including them was a big hit.",
    quote2: "Your customer service was outstanding! The books arrived in plenty of time to set up the fair in the library. Anytime that I had questions or a few issues, Ana answered me immediately and was so understanding and helpful.",
    quote3: "Everyone was so impressed with the outstanding quality and selection of the books. It was so rewarding to see the parents excitement over books that they had read. Now they bought these books for their children. When our students joyfully bought books about our Catholic faith, we felt so blessed to be giving honor and glory to God. It was a great selection of books about the Catholic faith for children. It was more than saint books. Thank you again for providing a CATHOLIC book fair to a small Catholic school in Texas.",
  },
  {
    name: "Anna Cameron, Librarian at Our Lady of Mount Carmel Catholic School in Tempe, Arizona, (450 students), hosted an Ignatius Book Fair in February 2024.",
    quote: "My community and I LOVED the book fair and would like to host it again. I am also passing along your information to a few other Catholic schools in our diocese. We loved the quality of the books! LOVED them. In particular, we loved the books the Magnificat produces. There is a huge need and interest in vibrant, imaginative children's picture books that teach virtue, our faith, and STORIES from the lives of the saints. I can't thank you enough for your work to get these books into our hands. Our school and parish thanks you!",
  },
  {
    name: "Deborah Thomas, Principal at St. Louis School in Clarksville, Maryland (575 students), hosted an Ignatius Book Fair in March 2024.",
    quote: "Our Ignatius Book Fair went very well. We were very pleased with the process and books. We will be hosting a fair again next year! God bless and thank you!",
  },
];

const Testimonials = () => {
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
          {testimonials.map((testimonial, index) => (
            <div key={index}>
              <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-2">
                <strong>{testimonial.name}</strong>
              </p>
              <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-2">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              {testimonial.quote2 && (
                <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-2">
                  {testimonial.quote2}
                </p>
              )}
              {testimonial.quote3 && (
                <p className="text-[#02176f] text-sm md:text-base leading-relaxed mb-4">
                  {testimonial.quote3}
                </p>
              )}
            </div>
          ))}
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
