'use client';

import Image from 'next/image';
import Link from 'next/link';
import ScrollReveal from './ScrollReveal';
import OurStoryAccordion from './OurStoryAccordion';
import AnimatedTimeline from './AnimatedTimeline';
import { useVersion } from '@/contexts/VersionContext';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  borderColor?: string; // Optional colored border (e.g., '#42ADE2' for blue)
}

interface AboutPageClientProps {
  teamMembers: TeamMember[];
  founders: TeamMember[];
}

export default function AboutPageClient({ teamMembers, founders }: AboutPageClientProps) {
  const { isCatholic } = useVersion();

  return (
    <>
      {/* Hero Section - Blue Background */}
      <section className="bg-[#0066ff] pt-8 pb-16 relative overflow-hidden">
        {/* Background decorative squiggle */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/About-page-Squiggle.png"
            alt=""
            fill
            className="object-cover opacity-30"
          />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <ScrollReveal direction="down" duration={800}>
            <div className="flex justify-center mb-4 mt-6">
              <Image
                src="/images/AboutIBF.png"
                alt="About Ignatius Book Fairs"
                width={937}
                height={200}
                className="max-w-full h-auto"
                priority
              />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
            <ScrollReveal direction="left" delay={200}>
              <div className="text-white">
                <h2 className="font-handsome text-5xl md:text-6xl text-[#ffd41d] mb-2">Mission</h2>
                <p className="text-white/90 leading-relaxed">
                  {isCatholic
                    ? 'At Ignatius Book Fairs, we aim to foster a love of reading and ensure children can access literature that aligns with Christian values. We believe in the transformative power of books to mold character and enrich minds.'
                    : 'At Ignatius Book Fairs, we aim to foster a love of reading and ensure children can access great literature. We believe in the transformative power of books to mold character and enrich minds.'}
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={400}>
              <div className="flex justify-center">
                <Image
                  src="/images/Mission-Pic.png"
                  alt="Children at book fair"
                  width={354}
                  height={354}
                  className="w-[307px] h-[307px] md:w-[354px] md:h-[354px] object-contain"
                />
              </div>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center mt-4">
            <ScrollReveal direction="left" delay={200} className="order-2 lg:order-1">
              <div className="flex justify-center">
                <Image
                  src="/images/UniqueApproach-Image.png"
                  alt="Book selection"
                  width={354}
                  height={354}
                  className="w-[307px] h-[307px] md:w-[354px] md:h-[354px] object-contain"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={400} className="order-1 lg:order-2">
              <div className="text-white">
                <h2 className="font-handsome text-5xl md:text-6xl text-[#ffd41d] mb-2">Our Unique Approach</h2>
                <p className="text-white/90 leading-relaxed text-sm md:text-base">
                  {isCatholic
                    ? 'Ignatius Book Fairs invites students to explore more than a thousand—and growing—Christian and secular works that feed their imaginations and nourish their minds. The titles available are carefully handpicked by the staff of Ignatius Press and Ave Maria University, a team you can trust. In a landscape dominated by mainstream distributors like Scholastic, Ignatius Book Fairs offers an alternative that aligns with Christian values, ensuring kindergarten through 8th-grade readers discover books that will edify their minds, shape their character, and deepen their faith.'
                    : 'Ignatius Book Fairs invites students to explore more than a thousand—and growing—wholesome and secular works that feed their imaginations and nourish their minds. The titles available are carefully handpicked by the staff of Ignatius Press and Ave Maria University, a team you can trust. In a landscape dominated by mainstream distributors like Scholastic, Ignatius Book Fairs offers an alternative, ensuring kindergarten through 8th-grade readers discover books that will edify their minds, shape their character, and deepen their virtue.'}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <OurStoryAccordion />

      {/* Meet Loupio Section */}
      <section className="bg-[#ffd41d] py-20 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <ScrollReveal direction="left" className="lg:col-span-5">
              <div className="flex justify-center">
                <div className="relative">
                  <Image
                    src="/images/Loupio.png"
                    alt="Loupio mascot"
                    width={450}
                    height={550}
                    className="w-[280px] md:w-[350px] lg:w-[400px] h-auto object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="right" delay={200} className="lg:col-span-7">
              <div className="text-center lg:text-left">
                <h2 className="font-handsome text-5xl md:text-6xl text-[#0066ff] mb-1">meet loupio</h2>
                <h3 className="font-brother font-bold text-2xl md:text-3xl text-[#0066ff] mb-8 uppercase">Our Mascot</h3>
                <p className="text-gray-800 leading-relaxed text-lg max-w-xl mx-auto lg:mx-0">
                  {isCatholic
                    ? 'Loupio, our adventurous troubadour from 13th-century Italy, is not just a fun and engaging character but a symbol of our mission at Ignatius Book Fairs. His tales, set in the era of Francis of Assisi, are more than just stories; they are life lessons shared through engaging narratives. They teach about kindness, bravery, and honesty, aiming to inspire virtues of faith, hope, and charity in young readers.'
                    : 'Loupio, our adventurous troubadour from 13th-century Italy, is not just a fun and engaging character but a symbol of our mission at Ignatius Book Fairs. His tales are more than just stories; they are life lessons shared through engaging narratives. They teach about kindness, bravery, and honesty, aiming to inspire virtue in young readers.'}
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <AnimatedTimeline />

      {/* Supporting Section */}
      <section className="bg-[#c8e6d9] py-24 relative overflow-hidden">
        {/* Background decorative shape */}
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src="/images/SupportingIBF-BG.png"
            alt=""
            fill
            className="object-cover object-right"
          />
        </div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="left">
              <div>
                <h3 className="font-brother font-bold text-3xl md:text-4xl text-[#2e4057] mb-4 uppercase">SUPPORTING</h3>
                <h2 className="font-handsome text-4xl md:text-5xl text-[#0066ff] mb-6">Ignatius Book Fairs</h2>
                <p className="text-[#2e4057] text-lg mb-8">
                  Join the adventure! We invite you prayerfully to consider supporting our mission with a{' '}
                  <a 
                    href="https://afvapnqh.donorsupport.co/page/ibf" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[#0066ff] font-semibold underline hover:text-[#0055dd]"
                  >
                    $10+ monthly donation
                  </a>.
                </p>
                <a 
                  href="https://afvapnqh.donorsupport.co/page/ibf" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-block bg-[#ff6445] hover:bg-[#e55535] text-white font-brother font-bold uppercase px-8 py-4 rounded-full transition-all hover:scale-105 shadow-lg"
                >
                  Make a Donation
                </a>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="right" delay={200}>
              <div className="hidden lg:flex justify-center items-center">
                <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📚</div>
                    <p className="text-[#2e4057] font-semibold text-lg">Your support helps bring</p>
                    <p className="text-[#0066ff] font-bold text-3xl my-2">1000+</p>
                    <p className="text-[#2e4057] font-semibold text-lg">quality books to children</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Book Selections / Rich Tapestry Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image 
            src="/images/RichTapestry-Background.jpg" 
            alt="" 
            fill 
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#0066ff]/80"></div>
        </div>
        
        <ScrollReveal>
          <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
            <h3 className="font-handsome text-4xl md:text-5xl text-white mb-2">A Rich Tapestry</h3>
            <h2 className="font-brother font-bold text-4xl md:text-5xl text-white mb-12 uppercase">OF BOOK SELECTIONS</h2>
            
            <div className="bg-white rounded-xl p-8 shadow-lg max-w-2xl mx-auto">
              <p className="text-gray-700 text-lg">
                <Link href="https://shop.ignatiusbookfairs.com/" target="_blank" className="text-[#0066ff] underline hover:text-[#0055dd]">
                  Explore our extensive book collection
                </Link>
                , with something for all age groups and interests. From timeless classics to new favorites, our selection reflects our commitment to quality and value-driven content.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Visionaries & Team Section */}
      <section className="bg-[#0066ff] py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <ScrollReveal>
            <h3 className="font-handsome text-3xl text-[#ffd41d] mb-2">The Visionaries Behind</h3>
            <h2 className="font-brother font-bold text-4xl md:text-5xl text-white mb-6">IGNATIUS BOOK FAIRS</h2>
            
            <p className="text-white/90 max-w-3xl mx-auto mb-12">
              Meet the people behind the mission! Each brings their unique perspectives and 
              experiences to this project, united by a common goal: to enrich lives through good literature.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {founders.map((person, index) => (
              <ScrollReveal key={index} delay={index * 150}>
                <div className="text-center">
                  <div className="w-44 h-44 mx-auto mb-4">
                    <Image src={person.image} alt={person.name} width={176} height={176} className="w-full h-full object-contain" />
                  </div>
                  <h4 className="font-brother font-bold text-white text-lg">{person.name}</h4>
                  <p className="text-white/70 text-sm">{person.role}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

        </div>
      </section>

      {/* Meet the Team Section - White Background */}
      <section className="bg-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <ScrollReveal>
            <div className="mb-8">
              <Image src="/images/About-page-Squiggle.png" alt="" width={1000} height={50} className="w-full max-w-3xl mx-auto" />
            </div>

            <h2 className="font-brother font-bold text-4xl md:text-5xl text-[#ff6445] mb-12">MEET THE TEAM</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {teamMembers.map((member, index) => (
              <ScrollReveal key={index} delay={(index % 3) * 100}>
                <div className="text-center">
                  <div className="w-40 h-40 mx-auto mb-3">
                    {member.borderColor ? (
                      // Special styling for members with colored border (circular crop with border)
                      <div
                        className="w-full h-full rounded-full overflow-hidden"
                        style={{
                          border: `3px solid ${member.borderColor}`,
                          padding: '2px'
                        }}
                      >
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={160}
                          height={160}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                    ) : (
                      <Image src={member.image} alt={member.name} width={160} height={160} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <h4 className="font-brother font-semibold text-gray-800 text-base">{member.name}</h4>
                  <p className="text-gray-500 text-sm">{member.role}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
