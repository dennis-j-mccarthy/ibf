'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useVersion } from '@/contexts/VersionContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isCatholic, setVersion } = useVersion();

  return (
    <header className={`${isCatholic ? 'bg-[#0088ff]' : 'bg-[#ff6445]'} sticky top-0 z-50 transition-colors`}>
      <div className="max-w-[1500px] mx-auto px-[3%] py-4">
        <div className="flex justify-between items-center">
          {/* Left side: Logo + Nav links */}
          <div className="flex items-center gap-4">
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

            {/* Nav links next to logo */}
            <nav className="hidden md:flex items-center gap-6 ml-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              <Link
                href="/about"
                className="text-white text-sm font-semibold hover:opacity-80 transition-opacity uppercase tracking-wide"
              >
                ABOUT
              </Link>
              <Link
                href="/faqs"
                className="text-white text-sm font-semibold hover:opacity-80 transition-opacity uppercase tracking-wide"
              >
                FAQS
              </Link>
              <Link
                href="/blog"
                className="text-white text-sm font-semibold hover:opacity-80 transition-opacity uppercase tracking-wide"
              >
                BLOG
              </Link>
              {/* Version toggle */}
              <div className="flex items-center rounded-full overflow-hidden border border-white/40 ml-2">
                <button
                  onClick={() => setVersion('Catholic')}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
                    isCatholic
                      ? 'bg-white text-[#0088ff]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Catholic
                </button>
                <button
                  onClick={() => setVersion('Public')}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
                    !isCatholic
                      ? 'bg-white text-[#ff6445]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Public
                </button>
              </div>
            </nav>
          </div>

          {/* Right side: Action buttons */}
          <nav className="hidden md:flex items-center gap-6" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            <Link
              href="/"
              className={`text-white text-sm font-semibold border border-white rounded px-4 py-2 hover:bg-white ${isCatholic ? 'hover:text-[#0088ff]' : 'hover:text-[#ff6445]'} transition-colors uppercase tracking-wide`}
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
                HOME
              </Link>
              <Link
                href="/about"
                className="text-white text-sm font-semibold uppercase"
                onClick={() => setIsMenuOpen(false)}
              >
                ABOUT
              </Link>
              <Link
                href="/faqs"
                className="text-white text-sm font-semibold uppercase"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQS
              </Link>
              <Link
                href="/blog"
                className="text-white text-sm font-semibold uppercase"
                onClick={() => setIsMenuOpen(false)}
              >
                BLOG
              </Link>
              <div className="flex items-center rounded-full overflow-hidden border border-white/40 self-start">
                <button
                  onClick={() => setVersion('Catholic')}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
                    isCatholic
                      ? 'bg-white text-[#0088ff]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Catholic
                </button>
                <button
                  onClick={() => setVersion('Public')}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wide transition-all ${
                    !isCatholic
                      ? 'bg-white text-[#ff6445]'
                      : 'text-white/60 hover:text-white'
                  }`}
                  style={{ fontFamily: 'brother-1816, sans-serif' }}
                >
                  Public
                </button>
              </div>
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
  );
};

export default Header;