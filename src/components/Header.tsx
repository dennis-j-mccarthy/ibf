'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      {/* Primary Navigation - Blue Bar */}
      <header className="bg-[#0088ff]">
        <div className="max-w-[1500px] mx-auto px-[3%] py-5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/IBF_Logo-white.png"
                alt="Ignatius Book Fairs"
                width={200}
                height={50}
                className="h-10 w-auto"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              <Link
                href="/"
                className="text-white text-sm font-semibold border border-white rounded px-4 py-2 hover:bg-white hover:text-[#0088ff] transition-colors uppercase tracking-wide"
              >
                BOOK FAIRS
              </Link>
              <Link
                href="https://shop.ignatiusbookfairs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm font-semibold hover:opacity-80 transition-opacity uppercase tracking-wide"
              >
                SHOP
              </Link>
              <Link
                href="https://afvapnqh.donorsupport.co/page/ibf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white text-sm font-semibold hover:opacity-80 transition-opacity uppercase tracking-wide"
              >
                DONATE
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/30 mt-4">
              <nav className="flex flex-col space-y-4">
                <Link
                  href="/"
                  className="text-white text-sm font-semibold uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  BOOK FAIRS
                </Link>
                <Link
                  href="https://shop.ignatiusbookfairs.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm font-semibold uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  SHOP
                </Link>
                <Link
                  href="https://afvapnqh.donorsupport.co/page/ibf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white text-sm font-semibold uppercase"
                  onClick={() => setIsMenuOpen(false)}
                >
                  DONATE
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Secondary Navigation - White Bar */}
      <div className="bg-white border-b border-[#ddd] sticky top-0 z-50">
        <div className="max-w-[1500px] mx-auto px-[3%] py-3 flex justify-between items-center">
          {/* Left side - Public school message */}
          <div className="hidden md:block" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            <p className="text-[var(--black)] font-semibold text-sm mb-0">
              Not a Catholic School? We also serve public, Christian and Charter Schools!
            </p>
            <Link 
              href="/?mode=public" 
              className="text-[var(--balbs-orange)] text-sm font-medium hover:underline"
            >
              Switch to Public Mode
            </Link>
          </div>

          {/* Right side - Secondary nav links */}
          <nav className="flex items-center space-x-8 ml-auto" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            <Link
              href="/"
              className="text-[var(--black)] text-sm font-bold hover:opacity-70 transition-opacity uppercase tracking-wide"
            >
              HOME
            </Link>
            <Link
              href="/about"
              className="text-[var(--black)] text-sm font-bold hover:opacity-70 transition-opacity uppercase tracking-wide"
            >
              ABOUT
            </Link>
            <Link
              href="/faqs"
              className="text-[var(--black)] text-sm font-bold hover:opacity-70 transition-opacity uppercase tracking-wide"
            >
              FAQS
            </Link>
            <Link
              href="/blog"
              className="text-[var(--black)] text-sm font-bold hover:opacity-70 transition-opacity uppercase tracking-wide"
            >
              BLOG
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Header;