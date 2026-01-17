import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Press Room | Ignatius Book Fairs',
  description: 'Latest news, press releases, and media resources about Ignatius Book Fairs.',
};

const pressReleases = [
  {
    date: 'March 15, 2024',
    title: 'Ignatius Book Fairs Expands to 500+ Schools Nationwide',
    excerpt: 'The partnership between Ave Maria University and Ignatius Press continues to grow as more schools embrace faith-based literature.',
  },
  {
    date: 'February 1, 2024',
    title: 'Catholic Schools Week 2024: Record Book Fair Participation',
    excerpt: 'Catholic schools across the nation celebrated with Ignatius Book Fairs, setting new records for student engagement and book sales.',
  },
  {
    date: 'January 10, 2024',
    title: 'Ignatius Book Fairs Announces New Virtual Fair Platform',
    excerpt: 'New online platform makes it easier than ever for schools of all sizes to host book fairs and earn rewards for their libraries.',
  },
  {
    date: 'November 15, 2023',
    title: 'Loupio Mascot Brings Joy to Book Fairs Across America',
    excerpt: 'The beloved 13th-century troubadour character has become a favorite among students at Ignatius Book Fairs.',
  },
];

const mediaResources = [
  { name: 'Press Kit (PDF)', description: 'Complete press kit with logos, photos, and company information' },
  { name: 'Logo Package', description: 'High-resolution logos in various formats' },
  { name: 'Fact Sheet', description: 'Key facts and figures about Ignatius Book Fairs' },
  { name: 'Photo Gallery', description: 'High-resolution images from recent book fairs' },
];

export default function PressRoomPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[var(--accent)] to-[var(--primary-dark)] text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Press Room</h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto">
            Latest news, press releases, and media resources
          </p>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[var(--accent)] mb-10">Press Releases</h2>
          
          <div className="grid gap-8">
            {pressReleases.map((release, index) => (
              <article 
                key={index}
                className="bg-[var(--light-bg)] rounded-xl p-6 hover:shadow-lg transition-shadow"
              >
                <span className="text-sm text-[var(--primary)] font-semibold">
                  {release.date}
                </span>
                <h3 className="text-xl font-bold text-[var(--accent)] mt-2 mb-3">
                  {release.title}
                </h3>
                <p className="text-gray-600 mb-4">{release.excerpt}</p>
                <button className="text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)] transition-colors inline-flex items-center">
                  Read More
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Media Resources */}
      <section className="py-20 bg-[var(--light-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-[var(--accent)] mb-10">Media Resources</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mediaResources.map((resource, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl p-6 flex items-center justify-between hover:shadow-lg transition-shadow"
              >
                <div>
                  <h3 className="font-semibold text-[var(--accent)]">{resource.name}</h3>
                  <p className="text-gray-500 text-sm">{resource.description}</p>
                </div>
                <button className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-dark)] transition-colors flex-shrink-0 ml-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Contact */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[var(--accent)] rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Media Contact</h2>
            <p className="text-gray-300 mb-6">
              For press inquiries, interviews, or additional information, please contact our media relations team.
            </p>
            <div className="space-y-4">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:press@ignatiusbookfairs.com" className="text-[var(--secondary)] hover:underline">
                  press@ignatiusbookfairs.com
                </a>
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href="tel:888-771-2321" className="text-[var(--secondary)] hover:underline">
                  888-771-2321
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[var(--primary)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Host a Book Fair?</h2>
          <p className="text-gray-200 mb-8">
            Join hundreds of schools and parishes that have discovered the joy of Ignatius Book Fairs.
          </p>
          <Link
            href="/#inquiry-form"
            className="inline-block bg-white text-[var(--primary)] px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
