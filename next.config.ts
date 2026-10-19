import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    // The approved design merges contact into the distributors page (/analyze decision #4).
    return [
      { source: '/:locale(en|ar)/contact', destination: '/:locale/distributors', permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
