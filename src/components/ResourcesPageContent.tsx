'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Resource } from '@prisma/client';
import BookFairPlanner from './BookFairPlanner';

interface ResourcesPageContentProps {
  resources: Resource[];
}

type ActiveFilter = 'all' | 'Catholic In Person' | 'Catholic Virtual' | 'Parish In Person' | 'Public In Person' | 'Operational' | 'Advertising' | 'Tutorials' | 'Public';

const categoryColors: Record<string, string> = {
  Operational: '#ff6445',
  Advertising: '#00c853',
  Tutorials: '#b9dbc5',
  Public: '#02176f',
};

const getCategoryColor = (category: string | null) => categoryColors[category || ''] || '#ff6445';

export default function ResourcesPageContent({ resources }: ResourcesPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<Resource | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Handle URL-based modal opening
  useEffect(() => {
    const resourceSlug = searchParams.get('resource');
    if (resourceSlug) {
      const resource = resources.find(r => r.slug === resourceSlug);
      if (resource) {
        setSelectedResource(resource);
      }
    } else {
      setSelectedResource(null);
    }
  }, [searchParams, resources]);

  const openResourceModal = (resource: Resource) => {
    router.push(`/bookfair-resources?resource=${resource.slug}`, { scroll: false });
  };

  const closeResourceModal = () => {
    router.push('/bookfair-resources', { scroll: false });
  };

  const virtualGuideChildren = new Set([
    'virtual-book-fair-operational-guide',
    'digital-catalog',
    'you-caption-it-social-media-print-ad-1',
    'reading-challenge-campaign',
    'how-your-orders-benefit-your-school',
    'creating-a-parent-account',
    'virtual-backpack-flyer-2',
    'principal-parent-letter-virtual',
    'you-caption-it-social-media-post',
    'how-to-invite-a-teacher-to-a-classroom',
    'creating-your-admin-account',
  ]);

  const parishGuideChildren = new Set([
    'parish-book-fair-administrator-operational-guide',
    'social-media-guide',
    'fillable-social-media-post-2',
    'fillable-social-media-story',
    'what-makes-an-ignatius-book-fair-special',
    'creating-a-parent-account',
    'how-your-orders-benefit-your-school',
    'you-caption-it-social-media-post',
    'bookfair-sneak-peek',
    'fillable-backpack-flyer-1',
    'pulpit-announcement',
    'pos-device-instructions',
    'table-signs',
    'category-signs',
    'last-copy-tags',
    'reading-challenge-campaign',
    'coloring-sheet-1',
    'coloring-sheet-2',
    'coloring-sheet-3',
    'you-caption-it-social-media-story',
  ]);

  const publicGuideChildren = new Set([
    'public-book-fair-administrator-operational-guide',
    'training-workshop-public-part-1',
    'training-workshop-public-part-2',
    'public-blue-save-the-date',
    'public-half-page-save-date',
    'public-social-media-tips',
    'what-makes-an-ignatius-book-fair-special',
    'creating-a-parent-account',
    'how-your-orders-benefit-your-school',
    'public-yellow-save-the-date',
    'public-school-book-fair-sneak-peek',
    'public-letter-to-principal',
    'coming-soon-principal-letter',
    'public-student-wishlist',
    'public-teacher-wishlist',
    'public-virtual-teacher-wishlist',
    'pos-device-instructions',
    'public-last-copy',
    'public-social-media-post',
    'social-feed-the-imagination-public',
    'coloring-sheet-1',
    'coloring-sheet-2',
    'coloring-sheet-3',
  ]);

  // Get related resources (same parentGuide, excluding current)
  const getRelatedResources = (resource: Resource) => {
    let related: Resource[];

    // Virtual guide: show both parentGuide children AND shared resources
    if (resource.slug === 'virtual-book-fair-operational-guide') {
      related = resources.filter(r =>
        r.id !== resource.id &&
        (r.parentGuide === 'virtual-book-fair-operational-guide' || virtualGuideChildren.has(r.slug))
      );
    }
    // Parish guide: show shared resources from the parish guide
    else if (resource.slug === 'parish-book-fair-administrator-operational-guide') {
      related = resources.filter(r =>
        r.id !== resource.id && parishGuideChildren.has(r.slug)
      );
    }
    // Public guide: show shared resources from the public guide
    else if (resource.slug === 'public-book-fair-administrator-operational-guide') {
      related = resources.filter(r =>
        r.id !== resource.id && publicGuideChildren.has(r.slug)
      );
    }
    // If this resource IS a parent guide, show its children
    else {
      const children = resources.filter(r => r.parentGuide === resource.slug);
      if (children.length > 0) {
        related = children;
      } else if (!resource.parentGuide) {
        return [];
      } else {
        related = resources
          .filter(r => r.parentGuide === resource.parentGuide && r.id !== resource.id);
      }
    }

    // Sort coloring sheets to the bottom
    return related.sort((a, b) => {
      const aIsColoring = a.slug.startsWith('coloring-sheet');
      const bIsColoring = b.slug.startsWith('coloring-sheet');
      if (aIsColoring && !bIsColoring) return 1;
      if (!aIsColoring && bIsColoring) return -1;
      return 0;
    });
  };

  const audienceKeys = new Set(['Catholic In Person', 'Catholic Virtual', 'Parish In Person', 'Public In Person']);
  const categoryKeys = new Set(['Operational', 'Advertising', 'Tutorials', 'Public']);

  const row1Filters: { key: ActiveFilter; label: string; color: string }[] = [
    { key: 'all', label: 'ALL', color: 'bg-[#0066ff]' },
    { key: 'Operational', label: 'OPERATIONAL', color: 'bg-[#ff6445]' },
    { key: 'Advertising', label: 'ADVERTISING', color: 'bg-[#00c853]' },
    { key: 'Tutorials', label: 'TUTORIALS', color: 'bg-[#b9dbc5]' },
    { key: 'Public', label: 'PUBLIC', color: 'bg-[#02176f]' },
  ];

  const row2Filters: { key: ActiveFilter; label: string }[] = [
    { key: 'Catholic In Person', label: 'CATHOLIC IN PERSON' },
    { key: 'Catholic Virtual', label: 'CATHOLIC VIRTUAL' },
    { key: 'Parish In Person', label: 'PARISH IN PERSON' },
    { key: 'Public In Person', label: 'PUBLIC IN PERSON' },
  ];

  const applyFilter = (list: Resource[], filter: ActiveFilter) => {
    if (filter === 'all') return list;
    if (filter === 'Catholic In Person') {
      return list.filter(r => r.slug === 'book-fair-administrator-operational-guide' || r.parentGuide === 'book-fair-administrator-operational-guide');
    }
    if (filter === 'Catholic Virtual') {
      return list.filter(r => virtualGuideChildren.has(r.slug) || r.parentGuide === 'virtual-book-fair-operational-guide');
    }
    if (filter === 'Parish In Person') {
      return list.filter(r => parishGuideChildren.has(r.slug));
    }
    if (filter === 'Public In Person') {
      return list.filter(r => r.audience === 'Public In Person' || publicGuideChildren.has(r.slug));
    }
    if (audienceKeys.has(filter)) {
      return list.filter(r => r.audience === filter);
    }
    return list.filter(r => r.category === filter);
  };

  const getFilterCount = (filter: ActiveFilter) => {
    return applyFilter(resources, filter).length;
  };

  // When searching, search across all resources regardless of filter
  let baseResources = searchQuery.trim() ? resources : applyFilter(resources, activeFilter);

  const filteredResources = baseResources.filter(r => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      (r.description?.toLowerCase().includes(query) ?? false) ||
      (r.category?.toLowerCase().includes(query) ?? false)
    );
  }).sort((a, b) => {
    // Sort order: Guides first, then docs (PDF/Image), then videos
    const typeOrder = (r: Resource) => {
      if (r.slug.endsWith('operational-guide')) return 0; // Guides
      if (r.resourceType === 'Video') return 2; // Videos last
      return 1; // PDFs and Images in the middle
    };
    const aOrder = typeOrder(a);
    const bOrder = typeOrder(b);
    if (aOrder !== bOrder) return aOrder - bOrder;
    // Within same group, featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  return (
    <>
      {/* Hero Section - Blue background */}
      <section className="bg-[#0066ff] pt-16 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 style={{ fontFamily: 'brother-1816, sans-serif', fontSize: '75px', fontWeight: 900, marginBottom: '20px', lineHeight: '105%' }}>
              <span className="text-[#ff6445]">BOOK FAIR</span>{' '}
              <span className="text-[#00c853]">RESOURCES</span>
            </h1>
            <p className="text-white text-2xl leading-relaxed">
              Welcome to our Bookfair Resources Kit! Here you will find a variety of video, digital, and printable resources to advertise your book fair.
            </p>
            <p className="text-white text-2xl mt-4">
              Please{' '}
              <a href="mailto:bookfairpro@ignatiusbookclub.com" className="text-[#ffd41d] font-bold no-underline px-1 py-0.5 rounded border-2 border-transparent hover:bg-[#ffd41d] hover:text-white hover:border-[#ffd41d] transition-all duration-200">
                contact your Book Fair Manager
              </a>{' '}
              if you need help!
            </p>

            {/* Search Input */}
            <div className="relative max-w-md mx-auto mt-8">
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pl-12 rounded-full bg-white/10 border-2 border-white/30 text-white placeholder-white/60 focus:outline-none focus:border-white focus:bg-white/20 transition-all text-lg"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Row 1: Category Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-10">
            {row1Filters.map((filter) => {
              const count = filter.key === 'all' ? resources.length : getFilterCount(filter.key);
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-full font-brother text-xs font-semibold uppercase tracking-wide transition-all border-2 flex items-center gap-1.5 ${
                    activeFilter === filter.key
                      ? `${filter.color} text-white border-white`
                      : 'bg-transparent text-white border-white/50 hover:border-white hover:bg-white/15'
                  }`}
                >
                  {filter.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Row 2: Audience Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-3">
            {row2Filters.map((filter) => {
              const count = getFilterCount(filter.key);
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={`px-4 py-2 rounded-full font-brother text-xs font-semibold uppercase tracking-wide transition-all border-2 flex items-center gap-1.5 ${
                    activeFilter === filter.key
                      ? 'bg-white text-[#0066ff] border-white'
                      : 'bg-transparent text-white border-white/50 hover:border-white hover:bg-white/15'
                  }`}
                >
                  {filter.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="bg-[#b9dbc5] py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {filteredResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onVideoClick={() => resource.resourceType === 'Video' && setSelectedVideo(resource)}
                onDetailsClick={() => openResourceModal(resource)}
              />
            ))}
          </div>
          
          {filteredResources.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? `No resources found for "${searchQuery}"` : 'No resources found in this category.'}
            </div>
          )}
        </div>
      </section>

      {/* Book Fair Planner */}
      <BookFairPlanner resources={resources} />

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          resource={selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          relatedResources={getRelatedResources(selectedResource)}
          onClose={closeResourceModal}
          onRelatedClick={openResourceModal}
          onVideoClick={setSelectedVideo}
        />
      )}
    </>
  );
}

function ResourceCard({ resource, onVideoClick, onDetailsClick }: { resource: Resource; onVideoClick: () => void; onDetailsClick: () => void }) {
  const isVideo = resource.resourceType === 'Video';
  const isTutorial = resource.category === 'Tutorials';

  return (
    <div className={`relative bg-white rounded-xl p-4 pb-10 flex flex-col items-center text-center shadow-sm ${isVideo ? '' : 'border border-[#dddddd]'}`}>
      {/* Top action icons - positioned at card corners */}
      {!isVideo && (
        <>
          {/* Details icon - top left */}
          <button
            onClick={onDetailsClick}
            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#0066ff] hover:bg-[#0052cc] flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
            title="View details"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Download icon - top right */}
          {resource.fileUrl && (
            <a
              href={resource.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#00c853] hover:bg-[#00a843] flex items-center justify-center shadow-md transition-all hover:scale-110 z-10"
              title="Download"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
        </>
      )}

      {/* Thumbnail */}
      <div className="relative w-full max-w-[180px] aspect-[3/4] mt-4 border border-[#b9dbc5] rounded-lg overflow-hidden p-[5%]">
        {resource.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-lg">
            {isVideo ? (
              <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            ) : (
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
        )}

        {/* Video play button overlay */}
        {isVideo && (
          <button
            onClick={onVideoClick}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
              <svg className="w-6 h-6 text-[#ff6445] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Title - closer to thumbnail */}
      <h3 className="font-brother text-[#02176f] font-semibold text-base max-w-[180px]" style={{ margin: '8px 0 0 0', lineHeight: '120%' }}>
        {resource.title}
      </h3>

      {/* Category pill */}
      <span className="absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[10px] text-white uppercase tracking-wider px-2 py-[2px] rounded-full whitespace-nowrap" style={{ backgroundColor: getCategoryColor(resource.category) }}>
        {resource.category || 'Resource'}
      </span>

      {/* Featured star icon - bottom right */}
      {resource.featured && (
        <div className="absolute bottom-2 right-2">
          <svg className="w-5 h-5 text-[#ffc107]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function ResourceDetailModal({
  resource,
  relatedResources,
  onClose,
  onRelatedClick,
  onVideoClick,
}: {
  resource: Resource;
  relatedResources: Resource[];
  onClose: () => void;
  onRelatedClick: (resource: Resource) => void;
  onVideoClick: (resource: Resource) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Category eyebrow */}
          <span className="text-[10px] uppercase tracking-wider font-semibold block mb-3" style={{ color: getCategoryColor(resource.category) }}>
            {resource.category || 'Resource'}
          </span>

          {/* Main resource preview */}
          <div className="flex gap-8 items-start">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-40">
              <div className="aspect-[3/4] bg-white rounded-lg overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.10)]">
                {resource.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resource.thumbnail}
                    alt={resource.title}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-[#02176f] mb-3 leading-tight" style={{ fontFamily: 'brother-1816, sans-serif' }}>
                {resource.title}
              </h2>

              {resource.description && (
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  {resource.description}
                </p>
              )}

              {/* Buttons */}
              <div className="flex flex-wrap gap-3">
                {resource.fileUrl && (
                  <a
                    href={resource.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-[#00c853] hover:bg-[#00a843] text-white font-semibold px-5 py-2.5 rounded-full transition-colors"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </a>
                )}
                {resource.slug === 'book-fair-administrator-operational-guide' && (
                  <a
                    href="/guide/catholic-in-person"
                    className="inline-flex items-center gap-2 bg-[#0066ff] hover:bg-[#0052cc] text-white font-semibold px-5 py-2.5 rounded-full transition-colors"
                    style={{ fontFamily: 'brother-1816, sans-serif' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Interactive Guide
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Related Resources */}
          {relatedResources.length > 0 && (
            <div className="border-t border-gray-100 mt-8 pt-6">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-4">
                Related Resources
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-6">
                {relatedResources.map((related) => {
                  const isVideo = related.resourceType === 'Video';
                  return (
                  <button
                    key={related.id}
                    onClick={() => { if (isVideo) { onClose(); onVideoClick(related); } else { onRelatedClick(related); } }}
                    className="group text-left"
                  >
                    <div className="relative aspect-[3/4] bg-white rounded-lg overflow-hidden mb-2 shadow-[0_2px_8px_rgba(0,0,0,0.10)] group-hover:ring-2 ring-[#0066ff] transition-all max-w-[100px] mx-auto">
                      {related.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={related.thumbnail}
                          alt={related.title}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <svg className="w-4 h-4 text-[#ff6445] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#02176f] font-medium leading-tight group-hover:text-[#0066ff] line-clamp-2 text-center">
                      {related.title}
                    </p>
                  </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VideoModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  // Load Wistia script if this is a Wistia video
  useEffect(() => {
    if (resource.embedCode?.includes('wistia-player')) {
      // Check if Wistia script is already loaded
      if (!document.querySelector('script[src*="wistia"]')) {
        const script = document.createElement('script');
        script.src = 'https://fast.wistia.com/assets/external/E-v1.js';
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, [resource.embedCode]);

  // Process embed code to handle iframes (Loom, YouTube) and Wistia custom elements
  const processEmbedCode = (embedCode: string) => {
    // For iframes (Loom, YouTube), make them responsive
    let processed = embedCode
      .replace(/width="[^"]*"/gi, '')
      .replace(/height="[^"]*"/gi, '')
      .replace(/style="[^"]*"/gi, '')
      .replace(/<iframe/gi, '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"');

    // For Wistia players, ensure they're responsive and add required attributes
    if (processed.includes('wistia-player')) {
      processed = processed.replace(
        /<wistia-player([^>]*)>/gi,
        '<wistia-player$1 style="position:absolute;top:0;left:0;width:100%;height:100%">'
      );
    }

    return processed;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-black rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video embed - responsive container */}
        <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
          {resource.embedCode ? (
            <div
              className="absolute inset-0"
              dangerouslySetInnerHTML={{ __html: processEmbedCode(resource.embedCode) }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white bg-gray-900">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-400">Video not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Title and description */}
        <div className="p-6 bg-gradient-to-t from-black to-gray-900">
          <h3 className="text-white font-bold text-xl mb-2" style={{ fontFamily: 'brother-1816, sans-serif' }}>
            {resource.title}
          </h3>
          {resource.description && (
            <p className="text-gray-300 text-sm leading-relaxed">{resource.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
