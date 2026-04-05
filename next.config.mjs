import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Undgå offentlige source maps i prod. Sæt BUDR_PRODUCTION_SOURCE_MAPS=1 ved build hvis I bevidst vil have dem.
  productionBrowserSourceMaps: process.env.BUDR_PRODUCTION_SOURCE_MAPS === '1',
  distDir: process.env.DIST_DIR || '.next',

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
  },

  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(self), geolocation=()',
      },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'self'",
      },
    ];
    if (process.env.NODE_ENV === 'production') {
      security.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }
    return [{ source: '/:path*', headers: security }];
  },

  async redirects() {
    return [];
  },
};
export default nextConfig;
