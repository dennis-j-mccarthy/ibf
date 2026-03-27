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
    tax_exempt_form?: string;
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
    fetch(`/api/school-logo?domain=${encodeURIComponent(school)}`, { cache: 'no-store' })
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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#ff6445] to-[#e04520] text-white py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4">
          {/* Logo + Welcome — side by side on desktop */}
          <div className={`flex flex-col ${schoolLogo ? 'md:flex-row' : ''} items-center gap-6 md:gap-8`}>
            {schoolLogo && (
              <div className="flex-shrink-0 rounded-2xl p-4 shadow-lg bg-[#42ADE2]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={schoolLogo}
                  alt={data.company?.name || 'School logo'}
                  className="h-20 md:h-24 w-auto object-contain"
                />
              </div>
            )}
            <div className={schoolLogo ? 'text-center md:text-left' : 'text-center w-full'}>
              <h1
                className="text-3xl md:text-5xl font-bold mb-1"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                Welcome{data.company?.name ? `, ${data.company.name}` : ''}!
              </h1>
              {data.company?.city && data.company?.state && (
                <p className="text-lg opacity-80" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  {data.company.city}, {data.company.state}
                </p>
              )}
            </div>
          </div>
          {/* Upcoming fair dates */}
          {data.upcomingDeal && data.company?.book_fair_dates && (
            <div className="mt-8 text-center">
              <div className="bg-white rounded-2xl inline-block px-10 py-6">
                <p className="text-[#ff6445] uppercase tracking-widest text-sm font-bold mb-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  Your Upcoming Fair
                </p>
                <p className="text-3xl md:text-4xl font-bold text-[#ff6445]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                  {data.company.book_fair_dates}
                </p>
                <a
                  href="#planning-calendar"
                  onClick={(e) => { e.preventDefault(); document.getElementById('planning-calendar')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="inline-flex items-center gap-2 mt-4 bg-[#42ADE2] text-white font-bold uppercase tracking-wider text-base px-6 py-3 rounded-xl hover:bg-[#3698c9] transition-colors"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  View Your Personalized Fair Calendar
                </a>
              </div>
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
          {/* Tax Exempt Reminder */}
          {/* TODO: restore condition: !data.company?.tax_exempt_form — always shown for demo */}
          {(
            <div className="mt-8 bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-5 flex flex-col items-center text-center gap-2">
              <svg className="w-8 h-8 text-[#FF8F00]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <p className="text-[#02176f] font-bold text-sm" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Don&apos;t forget to upload your tax exempt docs!
              </p>
              <Link
                href="/upload-tax-document"
                className="text-[#0088ff] hover:text-[#0070dd] text-sm font-semibold underline underline-offset-2 transition-colors"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                Upload Tax Exempt Certificate
              </Link>
            </div>
          )}
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
