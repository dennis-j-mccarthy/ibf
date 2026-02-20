import HomePageClient from '@/components/HomePageClient';
import FAQSection from '@/components/FAQSection';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <HomePageClient>
      <FAQSection />
    </HomePageClient>
  );
}
