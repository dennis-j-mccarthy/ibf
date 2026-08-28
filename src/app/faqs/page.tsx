import { getFAQs } from '@/lib/data';
import FAQsPageContent from '@/components/FAQsPageContent';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'FAQs | Ignatius Book Fairs',
  description: 'Frequently asked questions about hosting an Ignatius Book Fair. Learn about our process, rewards, and how to get started.',
};

export default async function FAQsPage({
  searchParams,
}: {
  searchParams: Promise<{ faqsource?: string }>;
}) {
  // ?faqsource=kb renders this page from the knowledge base instead of the FAQ
  // table, so both can be compared on the real site before switching over.
  const { faqsource } = await searchParams;
  const source = faqsource === 'kb' ? 'kb' : faqsource === 'legacy' ? 'legacy' : undefined;

  // Fetch both Catholic and Public FAQs (all pages, not just Home)
  const [catholicFaqs, publicFaqs] = await Promise.all([
    getFAQs({ version: 'Catholic', source }),
    getFAQs({ version: 'Public', source }),
  ]);

  return (
    <FAQsPageContent 
      catholicFaqs={catholicFaqs} 
      publicFaqs={publicFaqs} 
    />
  );
}
