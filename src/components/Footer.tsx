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
    { href: '/press-room', label: 'PRESS ROOM' },
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
