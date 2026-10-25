import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pages are rendered from the database at build time. Few workers keep the number of database connections low
  // (the VPS is shared with other apps), and each worker also renders only a few pages at a time.
  // authInterrupts lets admin pages answer 403 with forbidden() (US-007.4).
  experimental: { cpus: 3, staticGenerationMaxConcurrency: 4, authInterrupts: true },
  async headers() {
    // The admin must not be shown inside another site's frame (clickjacking), must not leak its addresses (invitation
    // links carry a token) in the Referer header, and its answers must not be sniffed as another type.
    const hardening = [
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ];
    return [
      { source: '/admin/:path*', headers: hardening },
      { source: '/api/admin/:path*', headers: hardening },
    ];
  },
  async redirects() {
    // The approved design merges contact into the distributors page (/analyze decision #4).
    return [
      { source: '/:locale(en|ar)/contact', destination: '/:locale/distributors', statusCode: 301 },
    ];
  },
};

export default withNextIntl(nextConfig);
