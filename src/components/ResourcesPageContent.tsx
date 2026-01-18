'use client';

import { useState } from 'react';
import type { Resource } from '@prisma/client';

interface ResourcesPageContentProps {
  resources: Resource[];
}

type FilterCategory = 'all' | 'Operational' | 'Advertising' | 'Tutorials' | 'Public';

export default function ResourcesPageContent({ resources }: ResourcesPageContentProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('Operational');
  const [selectedVideo, setSelectedVideo] = useState<Resource | null>(null);

  const filters: { key: FilterCategory; label: string; color: string }[] = [
    { key: 'all', label: 'ALL', color: 'bg-[#0066ff]' },
    { key: 'Operational', label: 'OPERATIONAL', color: 'bg-[#ff6445]' },
    { key: 'Advertising', label: 'ADVERTISING', color: 'bg-[#00c853]' },
    { key: 'Tutorials', label: 'TUTORIALS', color: 'bg-[#0066ff]' },
    { key: 'Public', label: 'PUBLIC', color: 'bg-gray-500' },
  ];

  const filteredResources = activeFilter === 'all' 
    ? resources 
    : resources.filter(r => r.category === activeFilter);

  return (
    <>
      {/* Hero Section - Blue background */}
      <section className="bg-[#0066ff] pt-16 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-handsome text-4xl md:text-5xl lg:text-6xl mb-6">
              <span className="text-[#ff6445]">BOOK FAIR</span>{' '}
              <span className="text-[#00c853]">RESOURCES</span>
            </h1>
            <p className="text-white text-lg leading-relaxed">
              Welcome to our Bookfair Resources Kit! Here you will find a variety of video, digital, and printable resources to advertise your book fair.
            </p>
            <p className="text-white text-lg mt-4">
              Please{' '}
              <a href="mailto:bookfairpro@ignatiusbookclub.com" className="underline hover:text-gray-200">
                contact your Book Fair Manager
              </a>{' '}
              if you need help!
            </p>
          </div>

          {/* Filter Bar - inside blue hero */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mt-10">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-5 py-2 rounded-full font-brother text-sm font-semibold uppercase tracking-wide transition-all border-2 ${
                  activeFilter === filter.key
                    ? `${filter.color} text-white border-white`
                    : 'bg-transparent text-white border-white/50 hover:border-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Grid */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {filteredResources.map((resource) => (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                onVideoClick={() => resource.resourceType === 'Video' && setSelectedVideo(resource)}
              />
            ))}
          </div>
          
          {filteredResources.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No resources found in this category.
            </div>
          )}
        </div>
      </section>

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal 
          resource={selectedVideo} 
          onClose={() => setSelectedVideo(null)} 
        />
      )}
    </>
  );
}

function ResourceCard({ resource, onVideoClick }: { resource: Resource; onVideoClick: () => void }) {
  const isVideo = resource.resourceType === 'Video';
  
  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'Operational': return 'bg-[#ff6445]';
      case 'Advertising': return 'bg-[#00c853]';
      case 'Tutorials': return 'bg-[#0066ff]';
      case 'Public': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };
  
  return (
    <div className="flex flex-col items-center text-center">
      {/* Category badge */}
      <span className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full text-white mb-4 ${getCategoryColor(resource.category)}`}>
        {resource.category || 'Resource'}
      </span>
      
      {/* Thumbnail */}
      <div className="relative w-full max-w-[200px] aspect-[3/4] bg-white border border-gray-200 rounded shadow-sm mb-4 overflow-hidden">
        {resource.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="absolute inset-0 w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-4xl">📄</span>
          </div>
        )}
        
        {/* Video play button overlay */}
        {isVideo && (
          <button 
            onClick={onVideoClick}
            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <svg className="w-6 h-6 text-[#ff6445] ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </button>
        )}
      </div>
      
      {/* Title */}
      <h3 className="font-brother text-[#0066ff] font-medium text-sm mb-3 leading-tight">
        {resource.title}
      </h3>
      
      {/* Actions */}
      <div className="flex items-center gap-4 text-sm">
        {isVideo ? (
          <button 
            onClick={onVideoClick}
            className="text-[#0066ff] hover:text-[#0052cc] font-medium underline"
          >
            watch
          </button>
        ) : resource.fileUrl ? (
          <a 
            href={resource.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0066ff] hover:text-[#0052cc] font-medium underline"
          >
            download
          </a>
        ) : null}
        
        {resource.hasDetails && (
          <a 
            href={`/resources/${resource.slug}`}
            className="text-[#0066ff] hover:text-[#0052cc] font-medium underline"
          >
            details
          </a>
        )}
      </div>
    </div>
  );
}

function VideoModal({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Video embed */}
        <div className="aspect-video">
          {resource.embedCode ? (
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: resource.embedCode.replace(/width="[^"]*"/g, 'width="100%"').replace(/height="[^"]*"/g, 'height="100%"') }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              Video not available
            </div>
          )}
        </div>
        
        {/* Title */}
        <div className="p-4 bg-gray-900">
          <h3 className="text-white font-semibold">{resource.title}</h3>
          {resource.description && (
            <p className="text-gray-400 text-sm mt-1">{resource.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
