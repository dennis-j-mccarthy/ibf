import { Metadata } from 'next';
import { getResources } from '@/lib/data';
import FairLandingContent from '@/components/FairLandingContent';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Your Book Fair | Ignatius Book Fairs',
  description: 'Your personalized book fair landing page with planning calendar, resources, and rep information.',
};

export default async function FairPage() {
  const resources = await getResources();

  return <FairLandingContent resources={resources} />;
}
