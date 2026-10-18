import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    env: { SITE_URL: 'http://localhost:3000' },
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
  },
});
