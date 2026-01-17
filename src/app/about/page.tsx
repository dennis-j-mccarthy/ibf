import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About | Ignatius Book Fairs',
  description: 'Learn about our mission to foster a love of reading and ensure children can access literature that aligns with Christian values.',
};

const teamMembers = [
  { name: 'Annie Esposito', role: 'Chief Operating Officer', image: '/images/AnnieEsposito.png' },
  { name: 'Dennis McCarthy', role: 'Digital Platforms & Marketing', image: '/images/Dennis.png' },
  { name: 'Jeannette Gibbons', role: 'Accounting Manager', image: '/images/jeanette1.png' },
  { name: 'Kristin Munin', role: 'Book Fair Manager', image: '/images/Kristin-Munin.png' },
  { name: 'Amy Shaw', role: 'Book Fair Manager', image: '/images/Amy-Shaw-website-2.png' },
  { name: 'Cassandra Husak', role: 'Purchasing & Inventory', image: '/images/cassandra.png' },
  { name: 'Susan Nutt', role: 'Book Fair Pro', image: '/images/SusanNutt.jpg' },
  { name: 'Rose Trabbic', role: 'Book and Product Manager', image: '/images/RoseTrabbic.jpg' },
  { name: 'Anna Bragdon', role: 'Book List Curator', image: '/images/AnnaBragdon.jpg' },
  { name: 'Veronica Salgado', role: 'Marketing Specialist', image: '/images/veronica.png' },
  { name: 'Kim Neumaier', role: 'Book Fair Pro', image: '/images/kim.png' },
  { name: 'Alma Cue', role: 'Book Fair Pro', image: '/images/AlmaCue.jpg' },
  { name: 'Jeanette Pohl', role: 'Book Fair Pro', image: '/images/jeannette2.png' },
  { name: 'Nick Capone', role: 'Video Production', image: '/images/Nick.png' },
  { name: 'Balbina O\'Brien', role: 'Graphic Design Lead', image: '/images/Balbina.png' },
];

const founders = [
  { name: 'Mark Middendorf', role: 'President, Ave Maria University', image: '/images/MarkMiddendorf.png' },
  { name: 'Fr. Joseph Fessio', role: 'Founder, Ignatius Press', image: '/images/Fessio.png' },
  { name: 'Mark Brumley', role: 'President, Ignatius Press', image: '/images/MarkBrumely-shape.png' },
];

const timeline = [
  { year: '1978', event: 'Ignatius Press is founded, marking the beginning of our journey to enrich the lives of young people through literature.', image: '/images/FoundingofIP.png' },
  { year: '1998', event: 'Ave Maria University is established, offering the best in Catholic liberal arts education to students at our southwestern Florida campus.', image: '/images/Establishment-AMU.png' },
  { year: '2020', event: 'Ignatius Press partners with the Augustine Institute, marking a significant moment of growth and expansion in vision.', image: '/images/FirstPartnership.png' },
  { year: '2023', event: 'Ignatius Press and Ave Maria University come together to create Ignatius Book Fairs, a new chapter in the story.', image: '/images/TheCollaboration-Badge.png' },
  { year: '2024', event: 'The introduction of the Book Club is set to expand our impact, reaching more readers and communities.', image: '/images/IntroductionofBookClub.png' },
  { year: 'Future', event: 'Our vision includes bringing the Book Fair and Club to a wider audience, encompassing parishes, public and charter schools, and other diverse groups.', image: '/images/Young-and-Old.png' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-[var(--accent)] text-white py-20 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/AboutIBF.png"
            alt=""
            fill
            className="object-cover object-center opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">About Ignatius Book Fairs</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            A partnership between Ave Maria University & Ignatius Press
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-sm font-semibold text-[var(--secondary)] tracking-widest uppercase mb-2">
                OUR PURPOSE
              </h2>
              <h3 className="text-4xl font-bold text-[var(--accent)] mb-6">Mission</h3>
              <p className="text-lg text-gray-600 mb-6">
                At Ignatius Book Fairs, we aim to foster a love of reading and ensure children 
                can access literature that aligns with Christian values. We believe in the 
                transformative power of books to mold character and enrich minds.
              </p>
              <Image
                src="/images/Mission-Pic.png"
                alt="Children at book fair"
                width={500}
                height={300}
                className="rounded-xl"
              />
            </div>
            <div>
              <div className="bg-[var(--light-bg)] rounded-2xl p-8 mb-6">
                <h4 className="text-xl font-semibold text-[var(--accent)] mb-4">Our Unique Approach</h4>
                <p className="text-gray-600">
                  Ignatius Book Fairs invites students to explore more than a thousand—and growing— 
                  Christian and secular works that feed their imaginations and nourish their minds. 
                  The titles available are carefully handpicked by the staff of Ignatius Press and 
                  Ave Maria University, a team you can trust. In a landscape dominated by mainstream 
                  distributors like Scholastic, Ignatius Book Fairs offers an alternative that aligns 
                  with Christian values, ensuring kindergarten through 8th-grade readers discover books 
                  that will edify their minds, shape their character, and deepen their faith.
                </p>
              </div>
              <Image
                src="/images/UniqueApproach-Image.png"
                alt="Book selection"
                width={500}
                height={200}
                className="rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Loupio Mascot Section */}
      <section className="py-20 bg-[var(--light-bg)] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-1/2 h-full">
          <Image
            src="/images/YellowBlob-LoupioSection.png"
            alt=""
            fill
            className="object-contain object-right opacity-50"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Image
                src="/images/Loupio.png"
                alt="Loupio mascot"
                width={400}
                height={500}
                className="mx-auto"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-sm font-semibold text-[var(--secondary)] tracking-widest uppercase mb-2">
                MEET LOUPIO
              </h2>
              <h3 className="text-4xl font-bold text-[var(--accent)] mb-6">Our Mascot</h3>
              <p className="text-lg text-gray-600">
                Loupio, our adventurous troubadour from 13th-century Italy, is not just a fun and 
                engaging character but a symbol of our mission at Ignatius Book Fairs. His tales, 
                set in the era of Francis of Assisi, are more than just stories; they are life 
                lessons shared through engaging narratives. They teach about kindness, bravery, 
                and honesty, aiming to inspire virtues of faith, hope, and charity in young readers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-[var(--secondary)] tracking-widest uppercase mb-2">
              OUR STORY
            </h2>
            <h3 className="text-4xl font-bold text-[var(--accent)]">A Journey Through Time</h3>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-[var(--primary)] hidden lg:block" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div
                  key={index}
                  className={`flex flex-col lg:flex-row items-center gap-8 ${
                    index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    <div className="bg-[var(--light-bg)] rounded-xl p-6 inline-block max-w-md">
                      <div className="flex items-center gap-4 mb-3">
                        <Image
                          src={item.image}
                          alt={item.year}
                          width={60}
                          height={60}
                          className="rounded-lg"
                        />
                        <span className="text-2xl font-bold text-[var(--primary)]">{item.year}</span>
                      </div>
                      <p className="text-gray-600">{item.event}</p>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[var(--primary)] border-4 border-white shadow-lg z-10 hidden lg:block" />
                  <div className="flex-1 hidden lg:block" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visionaries Section */}
      <section className="py-20 bg-[var(--accent)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-sm font-semibold text-[var(--secondary)] tracking-widest uppercase mb-2">
              THE VISIONARIES BEHIND
            </h2>
            <h3 className="text-4xl font-bold">IGNATIUS BOOK FAIRS</h3>
            <p className="mt-4 text-gray-300 max-w-2xl mx-auto">
              Meet the people behind the mission! Each brings their unique perspectives and 
              experiences to this project, united by a common goal: to enrich lives through the 
              power of good literature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {founders.map((person, index) => (
              <div key={index} className="text-center">
                <div className="w-40 h-40 mx-auto rounded-full overflow-hidden mb-4 bg-white">
                  <Image
                    src={person.image}
                    alt={person.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="text-xl font-semibold">{person.name}</h4>
                <p className="text-gray-300">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-[var(--accent)]">MEET THE TEAM</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center">
                <div className="w-28 h-28 mx-auto rounded-full overflow-hidden mb-3 bg-[var(--light-bg)]">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={112}
                    height={112}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h4 className="font-semibold text-[var(--accent)] text-sm">{member.name}</h4>
                <p className="text-gray-500 text-xs">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-[var(--light-bg)] relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/SupportingIBF-BG.png"
            alt=""
            fill
            className="object-cover opacity-20"
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-sm font-semibold text-[var(--secondary)] tracking-widest uppercase mb-2">
            SUPPORTING
          </h2>
          <h3 className="text-4xl font-bold text-[var(--accent)] mb-6">Ignatius Book Fairs</h3>
          <p className="text-lg text-gray-600 mb-8">
            Join the adventure! We invite you prayerfully to consider supporting our mission 
            with a monthly donation.
          </p>
          <a
            href="https://afvapnqh.donorsupport.co/page/ibf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[var(--primary)] text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-[var(--primary-dark)] transition-colors"
          >
            Donate Now
          </a>
        </div>
      </section>
    </>
  );
}
