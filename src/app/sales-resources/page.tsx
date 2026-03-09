import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sales Resources | Ignatius Book Fairs',
  description: 'Download branded sales flyers, ads, and promotional materials for Ignatius Book Fairs.',
};

const salesResources = [
  {
    title: 'In-Person Flyer',
    thumbnail: '/images/flyer-thumb.png',
    fileUrl: '/documents/ibf-flyer.pdf',
  },
  {
    title: 'BFIAB Sales Flyer',
    thumbnail: '/images/bfiab-sales-flyer-thumb.png',
    fileUrl: '/documents/bfiab-sales-flyer-8-20-24.pdf',
  },
  {
    title: 'Full Page Ad (Diocese)',
    thumbnail: '/images/ad-diocese-full-page-thumb.png',
    fileUrl: '/documents/ad-diocese-full-page.pdf',
  },
  {
    title: 'Half Page Ad (Diocese)',
    thumbnail: '/images/ad-diocese-half-page-thumb.png',
    fileUrl: '/documents/ad-diocese-half-page.pdf',
  },
  {
    title: 'Two-Page Flyer',
    thumbnail: '/images/two-page-flyer-thumb.png',
    fileUrl: '/documents/ibf-two-page-flyer.pdf',
  },
];

export default function SalesResourcesPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#0066ff] pt-16 pb-14">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1
              className="text-5xl md:text-7xl font-black uppercase mb-4"
              style={{ fontFamily: 'brother-1816, sans-serif', lineHeight: '105%' }}
            >
              <span className="text-[#ff6445]">Sales</span>{' '}
              <span className="text-[#00c853]">Resources</span>
            </h1>
            <p className="text-white text-lg md:text-xl max-w-xl mx-auto" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              Branded flyers, ads, and promotional materials to help spread the word about Ignatius Book Fairs.
            </p>
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="bg-[#b9dbc5] py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {salesResources.map((resource) => (
              <div key={resource.title} className="bg-white rounded-xl p-4 flex flex-col items-center shadow-sm">
                <div className="relative w-full aspect-[3/4] mb-4 border border-[#b9dbc5] rounded-lg overflow-hidden">
                  <Image
                    src={resource.thumbnail}
                    alt={resource.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h3
                  className="text-[#02176f] font-semibold text-base text-center mb-3"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  {resource.title}
                </h3>
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#00c853] hover:bg-[#00b048] text-white text-sm font-semibold uppercase tracking-wide rounded-full px-5 py-2 transition-colors"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
