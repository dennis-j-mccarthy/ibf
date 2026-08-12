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
  async redirects() {
    return [
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
