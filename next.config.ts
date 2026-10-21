import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pages are rendered from the database at build time. Few workers keep the number of database connections low
  // (the VPS is shared with other apps), and each worker also renders only a few pages at a time.
  experimental: { cpus: 3, staticGenerationMaxConcurrency: 4 },
  async redirects() {
    // The approved design merges contact into the distributors page (/analyze decision #4).
    return [
      { source: '/:locale(en|ar)/contact', destination: '/:locale/distributors', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
