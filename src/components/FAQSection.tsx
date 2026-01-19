import { getFAQs } from '@/lib/data';
import FAQSectionWithToggle from './FAQSectionWithToggle';

export default async function FAQSection() {
  // Fetch both Catholic and Public FAQs for the Home page
  const [catholicFaqs, publicFaqs] = await Promise.all([
    getFAQs({ pageTitle: 'Home', version: 'Catholic' }),
    getFAQs({ pageTitle: 'Home', version: 'Public' }),
  ]);

  return (
    <FAQSectionWithToggle 
      catholicFaqs={catholicFaqs} 
      publicFaqs={publicFaqs}
      showToggle={false}
      initialOpenIndex={0}
    />
  );
}
