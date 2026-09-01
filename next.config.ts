import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        // Vercel Blob — anything uploaded through the admin tools (blog
        // thumbnails, training images, tutorial posters). Without this,
        // next/image rejects the URL with INVALID_IMAGE_OPTIMIZE_REQUEST and
        // the image silently renders blank even though the file is fine.
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // The spec doc is a static file, so it can't carry Next metadata --
        // this header is the only way to keep it out of search results. Scoped
        // to this one file; nothing else on the site is affected.
        source: '/documents/ibf-ewallet-gift-flow.html',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async redirects() {
    return [
      // The Catholic in-person guide carried a Webflow hash and a January date
      // in its filename long after the August revision replaced it. Renamed for
      // honesty; this keeps every link already sent to coordinators working.
      {
        source: '/documents/6972c6f5a779558d8d96668a_in-person-guide-catholic-1-22-26.pdf',
        destination: '/documents/in-person-guide-catholic-8-31-26.pdf',
        permanent: true,
      },
      // Old Webflow slugs that don't match current DB slugs
      {
        source: '/resources/you-caption-it---social-media-post',
        destination: '/bookfair-resources?resource=you-caption-it-social-media-post',
        permanent: true,
      },
      {
        source: '/resources/you-caption-it-social-media-or-print-ad-1',
        destination: '/bookfair-resources?resource=you-caption-it-social-media-print-ad-1',
        permanent: true,
      },
      {
        source: '/resources/ignatius-book-fairs---training-workshop-public-and-charter---part-1',
        destination: '/bookfair-resources?resource=training-workshop-public-part-1',
        permanent: true,
      },
      {
        source: '/resources/ignatius-book-fairs---training-workshop-public-and-charter---part-2',
        destination: '/bookfair-resources?resource=training-workshop-public-part-2',
        permanent: true,
      },
      // Catch-all for old /resources/:slug routes
      {
        source: '/resources/:slug',
        destination: '/bookfair-resources?resource=:slug',
        permanent: true,
      },
      // Old /resources page
      {
        source: '/resources',
        destination: '/bookfair-resources',
        permanent: true,
      },
      // Old /operational-resources route from Webflow site
      {
        source: '/operational-resources',
        destination: '/bookfair-resources',
        permanent: true,
      },
      // Old /about-ignatius-book-fairs route
      {
        source: '/about-ignatius-book-fairs',
        destination: '/about',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
