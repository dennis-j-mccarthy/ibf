import { Metadata } from 'next';
import { Suspense } from 'react';
import { getResources } from '@/lib/data';

export const dynamic = 'force-dynamic';
import ResourcesPageContent from '@/components/ResourcesPageContent';

export const metadata: Metadata = {
  title: 'Book Fair Resources | Ignatius Book Fairs',
  description: 'Download resources, guides, flyers, and video tutorials to help you run a successful Ignatius Book Fair.',
};

export default async function ResourcesPage() {
  const resources = await getResources();

  return (
    <Suspense fallback={<ResourcesLoadingSkeleton />}>
      <ResourcesPageContent resources={resources} />
    </Suspense>
  );
}

function ResourcesLoadingSkeleton() {
  return (
    <>
      <section className="bg-[#0066ff] pt-16 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="h-12 bg-white/20 rounded-lg w-3/4 mx-auto mb-6 animate-pulse" />
            <div className="h-6 bg-white/20 rounded w-full mx-auto animate-pulse" />
          </div>
        </div>
      </section>
      <section className="bg-[#b9dbc5] py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 h-64 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
