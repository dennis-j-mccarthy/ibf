'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useVersion } from '@/contexts/VersionContext';
import { useState, useEffect } from 'react';

// Terms lives in the bottom bar with the other legal/utility links.
const footerLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/faqs', label: 'FAQs' },
  { href: 'https://shop.ignatiusbookfairs.com/', label: 'Shop', external: true },
];

const socials = [
  {
    href: 'https://www.facebook.com/IgnatiusBookFairs',
    label: 'Facebook',
    path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z',
  },
  {
    href: 'https://www.instagram.com/ignatiusbookfairs/',
    label: 'Instagram',
    path: 'M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.42 3.92 3.94 2.38 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.73.07-2.4.11-3.16.79-3.27 3.27-.06 1.23-.07 1.58-.07 4.73s.01 3.5.07 4.73c.11 2.48.87 3.16 3.27 3.27 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c2.4-.11 3.16-.79 3.27-3.27.06-1.23.07-1.58.07-4.73s-.01-3.5-.07-4.73c-.11-2.48-.87-3.16-3.27-3.27-1.23-.06-1.58-.07-4.73-.07zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28zm5.14-3.2a1.15 1.15 0 1 1 0 2.31 1.15 1.15 0 0 1 0-2.31z',
  },
  {
    href: 'https://www.linkedin.com/company/ignatiusbookfairs/posts/?feedView=all',
    label: 'LinkedIn',
    path: 'M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z',
  },
];

const HEADING = 'text-white text-xs font-bold uppercase tracking-wider mb-3';
const LINK = 'text-white/85 hover:text-white text-sm transition-colors';
const FINE_PRINT = 'text-white/70 hover:text-white text-xs transition-colors';

const Footer = () => {
  const { version, setVersion } = useVersion();
  const [showModeSwitch, setShowModeSwitch] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('modeIndicatorDismissed');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowModeSwitch(isDismissed === 'true');
  }, []);

  const isCatholic = version === 'Catholic';

  const handleSwitch = () => {
    setVersion(isCatholic ? 'Public' : 'Catholic');
  };

  return (
    <footer className="bg-[#0088ff]" style={{ fontFamily: 'brother-1816, sans-serif' }}>
      <div className="max-w-[1500px] mx-auto px-[3%] py-12">
        {/* Four columns, all top- and left-aligned so the headings form one line
            across. The previous layout vertically centred columns of unequal
            height against each other and right-aligned only the last one. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div>
            <Image
              src="/images/IBF_Logo-white.png"
              alt="Ignatius Book Fairs"
              width={200}
              height={65}
              className="h-12 w-auto mb-4"
            />
            <p className="text-white/85 text-sm leading-snug max-w-[16rem]">
              A partnership between Ave Maria University &amp; Ignatius Press
            </p>
            <div className="flex gap-4 mt-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ignatius Book Fairs on ${s.label}`}
                  className="text-white/85 hover:text-white transition-colors"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <nav>
            <p className={HEADING}>Explore</p>
            <div className="flex flex-col gap-2 items-start">
              {footerLinks.map((link) =>
                link.external ? (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} className={LINK}>
                    {link.label}
                  </Link>
                )
              )}
            </div>
          </nav>

          {/* Book Battles — the interest form is the only way in, so it needs a
              route from the footer of every page. Tinted so it reads as a
              promotion rather than a fourth column of navigation. */}
          <div className="bg-white/10 rounded-lg p-4 self-start">
            <p className={HEADING}>Ignatius Book Battles</p>
            <p className="text-white/85 text-sm leading-snug mb-4 max-w-[16rem]">
              A reading competition built on stories that inspire, challenge, and delight.
            </p>
            <Link
              href="/book-battle-interest-form"
              className="inline-block bg-white/15 hover:bg-white/25 border border-white/30 text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded transition-colors"
            >
              Bring one to your school
            </Link>
          </div>

          {/* Contact */}
          <div>
            <p className={HEADING}>Need Help?</p>
            <a
              href="tel:888-771-2321"
              className="text-white text-xl font-bold hover:opacity-80 transition-opacity block mb-1"
            >
              888-771-2321
            </a>
            <p className="text-white/70 text-sm">Mon&ndash;Fri, 9&ndash;5 ET</p>
          </div>
        </div>

        {/* Legal and utility links, kept out of the main navigation */}
        <div className="border-t border-white/25 mt-10 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <p className="text-white/70 text-xs">&copy; 2026, Ignatius Press</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms-of-service" className={FINE_PRINT}>
              Terms of Service
            </Link>
            <Link href="/book-fair-admin/login" className={FINE_PRINT}>
              Coordinator Login
            </Link>
            {showModeSwitch && (
              <button onClick={handleSwitch} className={`${FINE_PRINT} uppercase`}>
                Switch to {isCatholic ? 'Public' : 'Catholic'} Mode
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
