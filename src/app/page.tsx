import HomeHero from '@/components/HomeHero';
import SignUpForm from '@/components/SignUpForm';
import HowItWorks from '@/components/HowItWorks';
import WhyHost from '@/components/WhyHost';
import DiscoverVideo from '@/components/DiscoverVideo';
import Testimonials from '@/components/Testimonials';
import FAQSection from '@/components/FAQSection';

export default function Home() {
  return (
    <>
      <HomeHero />
      <SignUpForm />
      <HowItWorks />
      <WhyHost />
      <DiscoverVideo />
      <Testimonials />
      <FAQSection />
    </>
  );
}
