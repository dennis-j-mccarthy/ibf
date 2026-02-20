import { getFAQs } from '@/lib/data';
import FAQsPageContent from '@/components/FAQsPageContent';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FAQs | Ignatius Book Fairs',
  description: 'Frequently asked questions about hosting an Ignatius Book Fair. Learn about our process, rewards, and how to get started.',
};

export default async function FAQsPage() {
  // Fetch both Catholic and Public FAQs (all pages, not just Home)
  const [catholicFaqs, publicFaqs] = await Promise.all([
    getFAQs({ version: 'Catholic' }),
    getFAQs({ version: 'Public' }),
  ]);

  return (
    <FAQsPageContent 
      catholicFaqs={catholicFaqs} 
      publicFaqs={publicFaqs} 
    />
  );
}
