'use client';

import ScrollReveal from './ScrollReveal';
import SignUpForm from './SignUpForm';
import HomeHero from './HomeHero';
import HowItWorks from './HowItWorks';
import WhyHost from './WhyHost';
import DiscoverVideo from './DiscoverVideo';
import Testimonials from './Testimonials';
import FAQSection from './FAQSection';

export default function HomePageClient() {
  return (
    <>
      <HomeHero />
      
      <ScrollReveal>
        <SignUpForm />
      </ScrollReveal>
      
      <ScrollReveal>
        <HowItWorks />
      </ScrollReveal>
      
      <ScrollReveal>
        <WhyHost />
      </ScrollReveal>
      
      <DiscoverVideo />
      
      <ScrollReveal>
        <Testimonials />
      </ScrollReveal>
      
      <ScrollReveal>
        <FAQSection />
      </ScrollReveal>
    </>
  );
}
