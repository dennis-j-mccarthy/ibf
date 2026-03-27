'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

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

export default function FairLandingPage() {
  const searchParams = useSearchParams();
  const school = searchParams.get('school');
  const [data, setData] = useState<FairData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!school) {
      setLoading(false);
      return;
    }

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

  // Build planning calendar link
  const calendarLink = (() => {
    if (!data?.company?.book_fair_dates || !data?.upcomingDeal) return null;
    const dateText = data.company.book_fair_dates;
    const monthDayMatch = dateText.match(/^(\w+)\s+(\d+)/);
    const yearMatch = dateText.match(/(\d{4})/);
    const dealTypeMap: Record<string, string> = {
      'school book fair': 'catholic-in-person',
      'parish book fair': 'parish-in-person',
      'public book fair': 'public-in-person',
      'virtual book fair': 'catholic-virtual',
    };
    const fairType = dealTypeMap[(data.upcomingDeal.dealtype || '').toLowerCase()] || 'catholic-in-person';
    if (monthDayMatch && yearMatch) {
      const parsed = new Date(`${monthDayMatch[1]} ${monthDayMatch[2]}, ${yearMatch[1]}`);
      if (!isNaN(parsed.getTime())) {
        const dateParam = parsed.toISOString().split('T')[0];
        return `/bookfair-resources?type=${fairType}&date=${dateParam}#planning-calendar`;
      }
    }
    return null;
  })();

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

  return (
    <div className="min-h-screen bg-[#F3FDF5]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#ff6445] to-[#e04520] text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Image
            src="/images/IBF_Logo-white.png"
            alt="Ignatius Book Fairs"
            width={240}
            height={60}
            className="mx-auto mb-8"
          />
          <h1
            className="text-4xl md:text-6xl font-bold mb-4"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            Welcome{data.contactName ? `, ${data.contactName}` : ''}!
          </h1>
          {data.company?.name && (
            <p className="text-2xl md:text-3xl font-semibold opacity-95" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {data.company.name}
            </p>
          )}
          {data.company?.city && data.company?.state && (
            <p className="text-lg opacity-80 mt-1" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              {data.company.city}, {data.company.state}
            </p>
          )}
        </div>
      </section>

      {/* Fair Details */}
      <section className="py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          {/* Upcoming Fair Card */}
          {data.upcomingDeal && data.company?.book_fair_dates && (
            <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 text-center mb-8">
              <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Your Upcoming Fair
              </p>
              <p className="text-4xl md:text-5xl font-bold text-[#02176f] mb-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                {data.company.book_fair_dates}
              </p>

              {calendarLink && (
                <Link
                  href={calendarLink}
                  className="inline-block bg-[#50db92] text-white font-bold uppercase px-8 py-4 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  View My Planning Calendar
                </Link>
              )}
            </div>
          )}

          {/* Rep + Booking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Rep Card */}
            {data.owner && (
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

            {/* Quick Links Card */}
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-4" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Quick Links
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  href="/bookfair-resources"
                  className="bg-[#0088ff] text-white font-bold uppercase px-6 py-3 rounded-xl hover:bg-[#0070dd] transition-colors tracking-wider text-sm"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Book Fair Resources
                </Link>
                <Link
                  href="/faqs"
                  className="bg-[#02176f] text-white font-bold uppercase px-6 py-3 rounded-xl hover:bg-[#01124f] transition-colors tracking-wider text-sm"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  FAQs
                </Link>
                <Link
                  href="https://shop.ignatiusbookfairs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#50db92] text-white font-bold uppercase px-6 py-3 rounded-xl hover:bg-[#45c583] transition-colors tracking-wider text-sm"
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Shop
                </Link>
              </div>
            </div>
          </div>

          {/* Appointment Scheduler */}
          {data.bookingUrl && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mt-8">
              <p className="text-[#0088ff] uppercase tracking-widest text-sm font-bold mb-4 text-center" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Schedule a Meeting with Your Rep
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
        </div>
      </section>
    </div>
  );
}
