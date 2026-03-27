'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import BookFairPlanner from '@/components/BookFairPlanner';
import type { Resource } from '@prisma/client';

interface FairData {
  found: boolean;
  contactName?: string;
  company?: {
    name?: string;
    domain?: string;
    city?: string;
    state?: string;
    book_fair_dates?: string;
    book_fair_status?: string;
  };
  upcomingDeal?: {
    dealname?: string;
    book_fair_start_date?: string;
    book_fair_end_date?: string;
    dealtype?: string;
  };
  lastDeal?: {
    dealname?: string;
    book_fair_start_date?: string;
  };
  owner?: {
    firstName: string;
    lastName: string;
    email?: string;
  };
  bookingUrl?: string;
}

const DEAL_TYPE_MAP: Record<string, string> = {
  'school book fair': 'catholic-in-person',
  'parish book fair': 'parish-in-person',
  'public book fair': 'public-in-person',
  'virtual book fair': 'catholic-virtual',
};

// Resources by fair type: guide slug, checklist slug, FAQ slug
const RESOURCES_BY_TYPE: Record<string, { guide: string; checklist: string; faq: string; guideThumbnail: string; checklistThumbnail: string; faqThumbnail: string }> = {
  'catholic-in-person': {
    guide: 'book-fair-administrator-operational-guide',
    checklist: 'catholic-school-planning-checklist',
    faq: 'faqs-catholic-in-person-coordinators',
    guideThumbnail: '/images/thumb-guide-catholic.png',
    checklistThumbnail: '/images/checklist-catholic-3-17-thumb.png',
    faqThumbnail: '/images/faqs-in-person-catholic-thumb.png',
  },
  'catholic-virtual': {
    guide: 'virtual-book-fair-operational-guide',
    checklist: 'virtual-book-fair-checklist',
    faq: 'faqs-virtual-coordinators',
    guideThumbnail: '/images/thumb-guide-virtual.png',
    checklistThumbnail: '/images/checklist-virtual-thumb.png',
    faqThumbnail: '/images/faqs-virtual-thumb.png',
  },
  'parish-in-person': {
    guide: 'parish-book-fair-administrator-operational-guide',
    checklist: 'parish-planning-checklist',
    faq: 'faqs-parish-in-person-coordinators',
    guideThumbnail: '/images/thumb-guide-parish.png',
    checklistThumbnail: '/images/checklist-parish-thumb.png',
    faqThumbnail: '/images/faqs-in-person-catholic-thumb.png',
  },
  'public-in-person': {
    guide: 'public-book-fair-administrator-operational-guide',
    checklist: 'public-school-planning-checklist',
    faq: 'faqs-public-in-person-coordinators',
    guideThumbnail: '/images/thumb-guide-public.png',
    checklistThumbnail: '/images/checklist-public-3-17-thumb.png',
    faqThumbnail: '/images/faqs-public-thumb.png',
  },
};

function FairLandingInner({ resources }: { resources: Resource[] }) {
  const searchParams = useSearchParams();
  const school = searchParams.get('school');
  const [data, setData] = useState<FairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!school) {
      setLoading(false);
      return;
    }

    // Fetch school logo via our API (tries Clearbit, then scrapes site)
    fetch(`/api/school-logo?domain=${encodeURIComponent(school)}`)
      .then(res => res.json())
      .then(result => { if (result.logo) setSchoolLogo(result.logo); })
      .catch(() => {});

    async function lookup() {
      try {
        const response = await fetch('/api/hubspot/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ website: school }),
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Lookup error:', error);
      } finally {
        setLoading(false);
      }
    }

    lookup();
  }, [school]);

  // Compute fair type and date for the planner
  const fairType = data?.upcomingDeal?.dealtype
    ? DEAL_TYPE_MAP[data.upcomingDeal.dealtype.toLowerCase()] || 'catholic-in-person'
    : null;

  const fairDateParam = (() => {
    if (!data?.upcomingDeal?.book_fair_start_date) return null;
    const parsed = new Date(data.upcomingDeal.book_fair_start_date + 'T12:00:00');
    if (isNaN(parsed.getTime())) return null;
    return data.upcomingDeal.book_fair_start_date;
  })();

  // Look up resource fileUrls from the database resources
  const resourceMap = new Map<string, Resource>();
  resources.forEach(r => resourceMap.set(r.slug, r));

  const typeResources = fairType ? RESOURCES_BY_TYPE[fairType] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3FDF5]">
        <p className="text-[#0088ff] text-lg" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          Loading your fair details...
        </p>
      </div>
    );
  }

  if (!school || !data?.found) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F3FDF5] px-4">
        <p className="text-gray-600 text-lg mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          {!school ? 'No school specified.' : 'We couldn\'t find your school in our system.'}
        </p>
        <Link
          href="/"
          className="bg-[#0088ff] text-white font-bold uppercase px-8 py-3 rounded-xl hover:bg-[#0070dd] transition-colors"
          style={{ fontFamily: 'brother-1816, sans-serif' }}
        >
          Go to Home Page
        </Link>
      </div>
    );
  }

  // Build quick link cards
  const quickLinks: { title: string; subtitle?: string; thumbnail: string; href: string; border?: boolean }[] = [
    {
      title: 'Create Store Account',
      subtitle: data.company?.name ? `All purchases benefit ${data.company.name}` : undefined,
      thumbnail: '/images/create-account-thumb.png',
      href: 'https://store.ignatiusbookfairs.com/?signup=true',
      border: true,
    },
  ];

  if (typeResources) {
    const guideResource = resourceMap.get(typeResources.guide);
    if (guideResource) {
      quickLinks.push({
        title: 'Your Guide',
        thumbnail: typeResources.guideThumbnail,
        href: `/bookfair-resources?resource=${typeResources.guide}`,
      });
    }
    const checklistResource = resourceMap.get(typeResources.checklist);
    if (checklistResource) {
      quickLinks.push({
        title: 'Your Checklist',
        thumbnail: typeResources.checklistThumbnail,
        href: `/bookfair-resources?resource=${typeResources.checklist}`,
      });
    }
    const faqResource = resourceMap.get(typeResources.faq);
    if (faqResource) {
      quickLinks.push({
        title: 'Your FAQ',
        thumbnail: typeResources.faqThumbnail,
        href: `/bookfair-resources?resource=${typeResources.faq}`,
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#F3FDF5]">
      {/* Hero — includes welcome + fair dates */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#ff6445] to-[#e04520] text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {schoolLogo && (
            <div className="inline-block bg-white rounded-2xl p-4 mb-8 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={schoolLogo}
                alt={data.company?.name || 'School logo'}
                className="h-16 md:h-20 w-auto object-contain"
              />
            </div>
          )}
          <h1
            className="text-4xl md:text-6xl font-bold mb-4"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Welcome{data.company?.name ? `, ${data.company.name}` : ''}!
          </h1>
          {data.company?.city && data.company?.state && (
            <p className="text-lg opacity-80 mt-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {data.company.city}, {data.company.state}
            </p>
          )}
          {data.upcomingDeal && data.company?.book_fair_dates && (
            <div className="mt-8 bg-white rounded-2xl inline-block px-10 py-6">
              <p className="text-[#ff6445] uppercase tracking-widest text-sm font-bold mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Your Upcoming Fair
              </p>
              <p className="text-3xl md:text-4xl font-bold text-[#ff6445]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                {data.company.book_fair_dates}
              </p>
              <a
                href="#planning-calendar"
                onClick={(e) => { e.preventDefault(); document.getElementById('planning-calendar')?.scrollIntoView({ behavior: 'smooth' }); }}
                className="inline-block mt-4 text-[#ff6445] font-bold uppercase tracking-wider text-lg hover:text-[#e04520] transition-colors underline underline-offset-4 decoration-2"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                View Your Personalized Fair Calendar
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Quick Links — 4 cards in a row */}
      <section className="py-12 md:py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-[#02176f] text-center mb-8" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            Quick Links
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className="bg-white rounded-2xl shadow-lg p-4 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className="w-full aspect-[3/4] relative mb-3 flex items-center justify-center">
                  <Image
                    src={link.thumbnail}
                    alt={link.title}
                    width={180}
                    height={240}
                    className={`max-w-full max-h-full object-contain rounded-lg ${link.border ? 'border border-gray-300' : ''}`}
                  />
                </div>
                <p
                  className="text-sm font-bold text-[#02176f] uppercase tracking-wide group-hover:text-[#0088ff] transition-colors"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  {link.title}
                </p>
                {link.subtitle && (
                  <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                    {link.subtitle}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Rep Info + Appointment Scheduler */}
      {(data.owner || data.bookingUrl) && (
        <section className="pb-12 md:pb-16">
          <div className="max-w-4xl mx-auto px-4">
            {data.bookingUrl && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                {data.owner && (
                  <div className="text-center mb-6">
                    <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                      Your Book Fair Rep
                    </p>
                    <p className="text-2xl font-bold text-[#02176f]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                      {data.owner.firstName} {data.owner.lastName}
                    </p>
                    {data.owner.email && (
                      <a
                        href={`mailto:${data.owner.email}`}
                        className="inline-block mt-1 text-[#0088ff] hover:text-[#0070dd] transition-colors underline underline-offset-2"
                        style={{ fontFamily: 'brother-1816, sans-serif' }}
                      >
                        {data.owner.email}
                      </a>
                    )}
                  </div>
                )}
                <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-4 text-center" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Schedule a Meeting
                </p>
                <iframe
                  src={`${data.bookingUrl}?embed=true`}
                  width="100%"
                  height="660"
                  className="border-0 rounded-lg"
                  title="Book a meeting"
                />
              </div>
            )}
            {!data.bookingUrl && data.owner && (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Your Book Fair Rep
                </p>
                <p className="text-2xl font-bold text-[#02176f]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  {data.owner.firstName} {data.owner.lastName}
                </p>
                {data.owner.email && (
                  <a
                    href={`mailto:${data.owner.email}`}
                    className="inline-block mt-3 text-[#0088ff] hover:text-[#0070dd] transition-colors underline underline-offset-2"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    {data.owner.email}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Planning Calendar */}
      {data.upcomingDeal && fairType && fairDateParam && (
        <BookFairPlanner
          resources={resources}
          initialFairType={fairType}
          initialFairDate={fairDateParam}
        />
      )}
    </div>
  );
}

export default function FairLandingContent({ resources }: { resources: Resource[] }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F3FDF5]">
        <p className="text-[#0088ff] text-lg" style={{ fontFamily: 'brother-1816, sans-serif' }}>
          Loading your fair details...
        </p>
      </div>
    }>
      <FairLandingInner resources={resources} />
    </Suspense>
  );
}
