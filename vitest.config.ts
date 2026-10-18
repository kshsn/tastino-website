import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    env: { SITE_URL: 'http://localhost:3000', DATABASE_URL: 'postgresql://unit-tests-do-not-connect@127.0.0.1:1/none' },
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
