import { Metadata } from 'next';
import { getResources } from '@/lib/data';
import ResourcesPageContent from '@/components/ResourcesPageContent';

export const metadata: Metadata = {
  title: 'Book Fair Resources | Ignatius Book Fairs',
  description: 'Download resources, guides, flyers, and video tutorials to help you run a successful Ignatius Book Fair.',
};

export default async function ResourcesPage() {
  const resources = await getResources();
  
  return <ResourcesPageContent resources={resources} />;
}
