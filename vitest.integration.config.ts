import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// Integration tests run against a real PostgreSQL database (never mocked), reset before every run.
const fileEnv = loadEnv('test', process.cwd(), '');
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL;
if (!TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for integration tests (see .env.example).');
// globalSetup runs in this process (not the test workers), so it reads the URL from here.
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;
process.env.APP_DATABASE_URL = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    env: {
      SITE_URL: 'http://localhost:3000',
      DATABASE_URL: TEST_DATABASE_URL,
      MEDIA_DIR: 'tests/.media',
      MEDIA_URL_BASE: '/media',
      // A fixed key for tests only (never used anywhere else).
      ADMIN_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=',
    },
  },
});
