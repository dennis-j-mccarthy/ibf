'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { FAQ as PrismaFAQ } from '@prisma/client';
import FAQTaggingModal from './FAQTaggingModal';
import ScrollReveal from './ScrollReveal';
import { useVersion } from '@/contexts/VersionContext';

// Subtle dot pattern background
const DotPattern = ({ opacity = 0.03 }: { opacity?: number }) => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      backgroundImage: `radial-gradient(circle, #0088ff ${1}px, transparent ${1}px)`,
      backgroundSize: '24px 24px',
      opacity,
    }}
  />
);

type FAQ = Pick<PrismaFAQ, 'id' | 'question' | 'answer' | 'pageTitle' | 'version'>;

interface FAQsPageContentProps {
  catholicFaqs: FAQ[];
  publicFaqs: FAQ[];
}

// Category configuration with images, colors, and sizes (heights in px for mobile/desktop)
const categoryConfig: Record<string, { image: string; bgColor: string; textColor: string; heightMobile: number; heightDesktop: number }> = {
  'Turning the Page': {
    image: '/images/FAQ-WHITE-TurningThePage.png',
    bgColor: 'bg-[#0088ff]',
    textColor: 'text-white',
    heightMobile: 32,
    heightDesktop: 42,
  },
  'Flow of the Fair': {
    image: '/images/TheFlowOfTheFair.png',
    bgColor: 'bg-white',
    textColor: 'text-[#02176f]',
    heightMobile: 56,
    heightDesktop: 72,
  },
  'Literature Logistics': {
    image: '/images/FAQ-WHITE-LiteratureLogistics.png',
    bgColor: 'bg-[#ff6445]',
    textColor: 'text-white',
    heightMobile: 52,
    heightDesktop: 69,
  },
  'Reader Rewards': {
    image: '/images/bookfair-rewards-header.png',
    bgColor: 'bg-white',
    textColor: 'text-[#02176f]',
    heightMobile: 48,
    heightDesktop: 61,
  },
  'Your Concerns Our Commitments': {
    image: '/images/FAQ-WHITE-YourConcernsOurCommitment.png',
    bgColor: 'bg-[#02176f]',
    textColor: 'text-white',
    heightMobile: 67,
    heightDesktop: 90,
  },
};

// Group FAQs by pageTitle
function groupByPageTitle(faqs: FAQ[]): Record<string, FAQ[]> {
  return faqs.reduce((acc, faq) => {
    const title = faq.pageTitle || 'General';
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);
}

// Clean up category titles for display
function formatCategoryTitle(pageTitle: string): string {
  return pageTitle
    .replace('FAQs ', '')
    .replace('FAQs', '')
    .trim() || 'General';
}

// Helper to parse version into tags
function getVersionTags(version: string): { catholic: boolean; public: boolean } {
  if (version === 'Both' || version === 'Catholic,Public' || version === 'Public,Catholic') {
    return { catholic: true, public: true };
  }
  return {
    catholic: version.includes('Catholic'),
    public: version.includes('Public'),
  };
}

export default function FAQsPageContent({ catholicFaqs, publicFaqs }: FAQsPageContentProps) {
  const { taggingMode } = useVersion();
  const [isCatholic, setIsCatholic] = useState(true);
  const [openIndices, setOpenIndices] = useState<Record<string, number | null>>({});
  const [selectedFaqForTagging, setSelectedFaqForTagging] = useState<FAQ | null>(null);
  // Merged deduplicated list of all FAQs — single source of truth for version tags
  const [allFaqs, setAllFaqs] = useState<FAQ[]>(() => {
    const map = new Map<number, FAQ>();
    catholicFaqs.forEach(f => map.set(f.id, f));
    publicFaqs.forEach(f => map.set(f.id, f));
    return Array.from(map.values());
  });
  const [editMode, setEditMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authError, setAuthError] = useState('');

  // In tagging mode show all FAQs; otherwise filter by current version using live version data
  const faqs = taggingMode
    ? allFaqs
    : allFaqs.filter(f => {
        const t = getVersionTags(f.version);
        return isCatholic ? t.catholic : t.public;
      });

  // Check for existing auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('faqEditAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Handle edit mode toggle with auth check
  const handleEditModeToggle = useCallback(() => {
    if (editMode) {
      // Turning off edit mode - no auth needed
      setEditMode(false);
    } else if (isAuthenticated) {
      // Already authenticated
      setEditMode(true);
    } else {
      // Need to authenticate
      setShowAuthModal(true);
    }
  }, [editMode, isAuthenticated]);

  // Handle login
  const handleLogin = useCallback((username: string, password: string) => {
    if (username === 'ibfadmin' && password === 'ibf') {
      setIsAuthenticated(true);
      setEditMode(true);
      setShowAuthModal(false);
      setAuthError('');
      sessionStorage.setItem('faqEditAuth', 'true');
    } else {
      setAuthError('Invalid username or password');
    }
  }, []);

  // Find the currently focused/open FAQ for tagging
  const getCurrentlyOpenFaq = useCallback((): FAQ | null => {
    for (const category of Object.keys(openIndices)) {
      const index = openIndices[category];
      if (index !== null) {
        const groupedFaqs = groupByPageTitle(faqs);
        if (groupedFaqs[category] && groupedFaqs[category][index]) {
          return groupedFaqs[category][index];
        }
      }
    }
    return null;
  }, [openIndices, faqs]);

  // Keyboard shortcuts:
  // - Option+Cmd+E to toggle edit/tagging mode
  // - Option+Cmd+A to open tagging modal for currently open FAQ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Option+Cmd modifier combo
      const hasOptionCmd = e.altKey && e.metaKey;

      if (!hasOptionCmd) return;

      // Option+Cmd+E - toggle edit mode
      if (e.code === 'KeyE') {
        e.preventDefault();
        handleEditModeToggle();
        return;
      }

      // Option+Cmd+A - open tagging modal (only if in edit mode)
      if (e.code === 'KeyA' && editMode) {
        e.preventDefault();
        const openFaq = getCurrentlyOpenFaq();
        if (openFaq) {
          setSelectedFaqForTagging(openFaq);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getCurrentlyOpenFaq, editMode, handleEditModeToggle]);

  // Handle FAQ tag update
  const handleFaqTagUpdate = (faqId: number, newVersion: string) => {
    // Update the single source of truth — filtering derives from this
    setAllFaqs((prev) => prev.map((f) => (f.id === faqId ? { ...f, version: newVersion } : f)));
  };

  // Delete FAQ (tagging mode only)
  const handleDeleteFaq = async (faqId: number) => {
    if (!confirm('Delete this FAQ? This cannot be undone.')) return;
    setAllFaqs((prev) => prev.filter((f) => f.id !== faqId));
    try {
      await fetch(`/api/faqs/${faqId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
    }
  };

  // Inline tag toggle for tagging mode (auto-saves)
  const handleInlineTagToggle = async (faq: FAQ, toggleType: 'catholic' | 'public') => {
    const tags = getVersionTags(faq.version);
    const newTags = { ...tags };
    newTags[toggleType] = !newTags[toggleType];

    let newVersion = '';
    if (newTags.catholic && newTags.public) newVersion = 'Both';
    else if (newTags.catholic) newVersion = 'Catholic';
    else if (newTags.public) newVersion = 'Public';

    handleFaqTagUpdate(faq.id, newVersion);
    try {
      await fetch(`/api/faqs/${faq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: newVersion }),
      });
    } catch (error) {
      console.error('Error updating FAQ tag:', error);
    }
  };

  const groupedFaqs = groupByPageTitle(faqs);

  const toggleFAQ = (category: string, index: number) => {
    setOpenIndices((prev) => ({
      ...prev,
      [category]: prev[category] === index ? null : index,
    }));
  };

  const handleVersionToggle = (catholic: boolean) => {
    setIsCatholic(catholic);
    setOpenIndices({}); // Reset open accordions when switching
  };

  // Define category order (categories not listed here will be hidden)
  const categoryOrder = [
    'Turning the Page',
    'Flow of the Fair',
    'Literature Logistics',
    'Reader Rewards',
    'Your Concerns Our Commitments',
  ];

  // Sort and filter categories (only show categories in the order list)
  const sortedCategories = Object.keys(groupedFaqs)
    .filter((category) => {
      const title = formatCategoryTitle(category);
      return categoryOrder.includes(title);
    })
    .sort((a, b) => {
      const aTitle = formatCategoryTitle(a);
      const bTitle = formatCategoryTitle(b);
      const aIndex = categoryOrder.indexOf(aTitle);
      const bIndex = categoryOrder.indexOf(bTitle);
      return aIndex - bIndex;
    });

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0">
          <Image
            src="/images/OrangeGreenBlobs.png"
            alt=""
            fill
            className="object-cover"
          />
        </div>

        <div className="relative z-10 py-16 md:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/* Main FAQ Image - serves as the headline */}
            <ScrollReveal direction="up" delay={0}>
              <div className="flex justify-center mb-10">
                <Image
                  src="/images/FAQ.png"
                  alt="Frequently Asked Questions"
                  width={700}
                  height={250}
                  className="max-w-full h-auto"
                />
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={150}>
              <p
                className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
                style={{ fontFamily: 'brother-1816, sans-serif' }}
              >
                Want to organize a book fair? You&apos;re in the right place! Our FAQ provides essential
                tips and guidance for initiating, starting, and managing a successful book fair.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="bg-white">
        {sortedCategories.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg" style={{ fontFamily: 'brother-1816, sans-serif' }}>
              No FAQs available for this category.
            </p>
          </div>
        ) : (
          sortedCategories.map((category, categoryIndex) => {
            const title = formatCategoryTitle(category);
            const config = categoryConfig[title] || {
              image: '/images/FAQ.png',
              bgColor: 'bg-[#0088ff]',
              textColor: 'text-white',
              heightMobile: 96,
              heightDesktop: 128,
            };

            return (
              <div key={category}>
                {/* Category Header - Image only */}
                <div className={`${config.bgColor} py-10`}>
                  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <ScrollReveal direction="up">
                      <div className={`flex justify-center ${categoryIndex > 0 ? 'mt-5' : ''}`}>
                        <Image
                          src={config.image}
                          alt={title}
                          width={400}
                          height={config.heightDesktop}
                          className="w-auto object-contain"
                          style={{ height: `clamp(${config.heightMobile}px, 10vw, ${config.heightDesktop}px)` }}
                        />
                      </div>
                    </ScrollReveal>
                  </div>
                </div>

                {/* FAQ Items - background color carries from header */}
                <div className={`${config.bgColor} pt-6 pb-10 relative`}>
                  {/* Subtle dot pattern on alternating sections */}
                  {categoryIndex % 2 === 0 && <DotPattern opacity={0.04} />}
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="space-y-4 pb-10">
                      {groupedFaqs[category].map((faq, index) => {
                        const tags = getVersionTags(faq.version);
                        const accentColor = isCatholic ? '#0088ff' : '#ff6445';
                        return (
                        <ScrollReveal key={faq.id} direction="up" delay={index * 75}>
                        <div
                          className={`bg-white rounded-2xl overflow-hidden shadow-sm border relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${editMode ? 'border-purple-300 border-2' : 'border-gray-100'}`}
                          style={{
                            borderLeft: `4px solid transparent`,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderLeftColor = accentColor)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderLeftColor = 'transparent')}
                        >
                          {/* Tag button - only visible in edit mode */}
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFaqForTagging(faq);
                              }}
                              className="absolute top-3 right-16 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                              title="Tag FAQ (⌥⌘A)"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </button>
                          )}
                          {/* Inline tag toggles - tagging mode */}
                          {taggingMode && (
                            <div className="absolute top-3 right-16 z-10 flex gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInlineTagToggle(faq, 'catholic'); }}
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${tags.catholic ? 'bg-[#0088ff] text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                title="Catholic"
                              >C</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleInlineTagToggle(faq, 'public'); }}
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all ${tags.public ? 'bg-[#ff6445] text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                title="Public"
                              >P</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFaq(faq.id); }}
                                className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-all bg-gray-200 text-red-500 hover:bg-red-500 hover:text-white"
                                title="Delete FAQ"
                              >✕</button>
                            </div>
                          )}
                          <button
                            onClick={() => toggleFAQ(category, index)}
                            className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                            style={{ fontFamily: 'brother-1816, sans-serif' }}
                          >
                            <div className="flex items-center gap-3 flex-1 pr-4">
                              {/* Version pills - only in edit mode */}
                              {editMode && (
                                <div className="flex gap-1 flex-shrink-0">
                                  {tags.catholic && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#0088ff] text-white">
                                      C
                                    </span>
                                  )}
                                  {tags.public && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#ff6445] text-white">
                                      P
                                    </span>
                                  )}
                                  {!tags.catholic && !tags.public && (
                                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-300 text-gray-600">
                                      ?
                                    </span>
                                  )}
                                </div>
                              )}
                              <span className="font-semibold text-[#02176f] text-lg">
                                {faq.question}
                              </span>
                            </div>
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                openIndices[category] === index
                                  ? 'bg-[#ff6445] rotate-180'
                                  : 'bg-[#0088ff]'
                              }`}
                            >
                              <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </button>
                          <div
                            className={`overflow-hidden transition-all duration-300 ${
                              openIndices[category] === index ? 'max-h-[2000px]' : 'max-h-0'
                            }`}
                          >
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100">
                              <div
                                className="text-gray-600 leading-relaxed prose prose-sm max-w-none"
                                style={{ fontFamily: 'brother-1816, sans-serif' }}
                                dangerouslySetInnerHTML={{ __html: faq.answer }}
                              />
                            </div>
                          </div>
                        </div>
                        </ScrollReveal>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Bottom CTA */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal direction="up" delay={0}>
            <h3
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Still have questions?
            </h3>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={100}>
            <p className="text-gray-700 mb-8 text-lg">
              We&apos;re here to help! Contact our team for personalized assistance.
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={200}>
            <a
              href="mailto:bookfairpro@ignatiusbookclub.com"
              className="inline-block bg-[#0088ff] text-white font-bold uppercase px-8 py-4 rounded-full hover:bg-[#0077dd] transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              style={{ fontFamily: 'brother-1816, sans-serif' }}
            >
              Contact Us
            </a>
          </ScrollReveal>
        </div>
      </section>

      {/* Edit Mode Indicator - only visible when in edit mode */}
      {editMode && (
        <div className="fixed bottom-4 left-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 bg-purple-600 text-white">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-medium">Edit Mode</span>
          <span className="text-xs opacity-75 ml-1">⌥⌘E to exit</span>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => setShowAuthModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-purple-600 px-6 py-4">
              <h2 className="text-white font-bold text-lg" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                Admin Login
              </h2>
              <p className="text-white/80 text-sm mt-1">Enter credentials to enable edit mode</p>
            </div>
            <form
              className="p-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const username = (form.elements.namedItem('username') as HTMLInputElement).value;
                const password = (form.elements.namedItem('password') as HTMLInputElement).value;
                handleLogin(username, password);
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              {authError && (
                <p className="text-red-600 text-sm">{authError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthError('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ Tagging Modal - Option+Cmd+A to open when FAQ is expanded */}
      {selectedFaqForTagging && (
        <FAQTaggingModal
          faq={selectedFaqForTagging}
          onClose={() => setSelectedFaqForTagging(null)}
          onUpdate={handleFaqTagUpdate}
        />
      )}

    </>
  );
}
