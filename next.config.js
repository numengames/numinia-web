/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    // Remove all console.* calls in production (keeps console.error for critical errors)
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.opensourceavatars.com' },
      { protocol: 'https', hostname: 'assetsdev.opensourceavatars.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'assets.numinia.store' },
      { protocol: 'https', hostname: '**.r2.dev' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'arweave.net' },
      { protocol: 'https', hostname: '**.arweave.net' },
      { protocol: 'https', hostname: '**.ipfs.io' },
      { protocol: 'https', hostname: 'dweb.link' },
      { protocol: 'https', hostname: '**.dweb.link' },
      { protocol: 'https', hostname: 'gateway.pinata.cloud' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  output: 'standalone',

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            // CSP: unsafe-eval required by Three.js (shader compilation, WASM).
            // unsafe-inline required by Next.js (inline styles, Tailwind).
            // Reviewed 2026-03-31. Remove when Three.js supports strict CSP.
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; media-src 'self' https://*.r2.dev https://*.r2.cloudflarestorage.com https://raw.githubusercontent.com; connect-src 'self' blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://assets.numinia.store https://assets.opensourceavatars.com https://*.ipfs.io https://dweb.link https://*.dweb.link https://gateway.pinata.cloud https://*.arweave.net https://arweave.net https://raw.githubusercontent.com https://api.github.com https://*.githubusercontent.com https://www.gstatic.com; frame-ancestors 'self';"
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
};

// Wrap with Sentry only when DSN is configured
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true, // Suppress source map upload logs during build
      disableLogger: true,
    })
  : nextConfig;
