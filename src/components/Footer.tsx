'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useVersion } from '@/contexts/VersionContext';
import { useState, useEffect } from 'react';

const Footer = () => {
  const { version, setVersion } = useVersion();
  const [showModeSwitch, setShowModeSwitch] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('modeIndicatorDismissed');
    setShowModeSwitch(isDismissed === 'true');
  }, []);

  const isCatholic = version === 'Catholic';

  const handleSwitch = () => {
    setVersion(isCatholic ? 'Public' : 'Catholic');
  };
  const footerLinks = [
    { href: '/', label: 'HOME' },
    { href: '/about', label: 'ABOUT' },
    { href: '/faqs', label: 'FAQS' },
    { href: 'https://shop.ignatiusbookfairs.com/', label: 'SHOP', external: true },
    { href: '/terms-of-service', label: 'TERMS OF SERVICE' },
  ];

  return (
    <footer className="bg-[#0088ff]">
      <div className="max-w-[1500px] mx-auto px-[3%] py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          {/* Navigation Links */}
          <nav
            className="flex flex-col space-y-1"
            style={{ fontFamily: 'brother-1816, sans-serif' }}
          >
            {footerLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:opacity-80 text-sm font-medium transition-opacity uppercase"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white hover:opacity-80 text-sm font-medium transition-opacity uppercase"
                >
                  {link.label}
                </Link>
              )
            )}

            <Link
              href="/book-fair-admin/login"
              className="text-white/60 hover:text-white text-xs font-medium transition-opacity mt-2"
            >
              Coordinator Login
            </Link>

            {/* Mode Switch - shows after popup is dismissed */}
            {showModeSwitch && (
              <button
                onClick={handleSwitch}
                className="text-white/80 hover:text-white text-sm font-medium transition-opacity uppercase mt-2"
              >
                Switch to {isCatholic ? 'Public' : 'Catholic'} Mode
              </button>
            )}
          </nav>

          {/* Book Battles — the interest form is the only way in, so it needs a
              route from the footer of every page. */}
          <div className="max-w-xs" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            <p className="text-white text-sm font-bold uppercase mb-1.5">
              Ignatius Book Battles
            </p>
            <p className="text-white/80 text-sm leading-snug mb-2.5">
              A reading competition built on stories that inspire, challenge, and delight.
            </p>
            <Link
              href="/book-battle-interest-form"
              className="text-white text-sm font-bold underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Bring one to your school &rarr;
            </Link>
          </div>

          {/* Logo & Info */}
          <div className="text-left md:text-right">
            <Image
              src="/images/IBF_Logo-white.png"
              alt="Ignatius Book Fairs"
              width={200}
              height={65}
              className="h-14 w-auto mb-3"
            />
            <p className="text-white text-sm mb-1">
              A partnership between Ave Maria University & Ignatius Press
            </p>
            <p className="text-white text-sm mb-3">
              © 2024, Ignatius Press
            </p>
            <p className="text-white text-sm">
              NEED HELP? CALL{' '}
              <a
                href="tel:888-771-2321"
                className="text-white hover:underline"
              >
                888-771-2321
              </a>
            </p>
            <div className="flex gap-4 mt-4 md:justify-end">
              <a
                href="https://www.facebook.com/IgnatiusBookFairs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ignatius Book Fairs on Facebook"
                className="text-white hover:opacity-80 transition-opacity"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/ignatiusbookfairs/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ignatius Book Fairs on Instagram"
                className="text-white hover:opacity-80 transition-opacity"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.2c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85C2.42 3.92 3.94 2.38 7.15 2.27 8.42 2.21 8.8 2.2 12 2.2zm0 1.8c-3.15 0-3.5.01-4.73.07-2.4.11-3.16.79-3.27 3.27-.06 1.23-.07 1.58-.07 4.73s.01 3.5.07 4.73c.11 2.48.87 3.16 3.27 3.27 1.23.06 1.58.07 4.73.07s3.5-.01 4.73-.07c2.4-.11 3.16-.79 3.27-3.27.06-1.23.07-1.58.07-4.73s-.01-3.5-.07-4.73c-.11-2.48-.87-3.16-3.27-3.27-1.23-.06-1.58-.07-4.73-.07zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28zm5.14-3.2a1.15 1.15 0 1 1 0 2.31 1.15 1.15 0 0 1 0-2.31z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/ignatiusbookfairs/posts/?feedView=all"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ignatius Book Fairs on LinkedIn"
                className="text-white hover:opacity-80 transition-opacity"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
