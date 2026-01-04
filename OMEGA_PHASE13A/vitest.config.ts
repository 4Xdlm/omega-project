import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['observability/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['observability/**/*.ts'],
      exclude: ['observability/tests/**']
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
