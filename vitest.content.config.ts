import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Content crawl: fetches the rendered public pages from a running local build (`npm run build && npm start`).
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/content/**/*.test.ts'],
    testTimeout: 120_000,
    env: { SITE_URL: 'http://localhost:3000', DATABASE_URL: 'postgresql://unit-tests-do-not-connect@127.0.0.1:1/none' },
  },
});
