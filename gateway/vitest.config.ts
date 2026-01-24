import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'tests/**/*.test.ts',
      'chaos/tests/**/*.test.ts',
      'cli-runner/tests/**/*.test.ts',
      'facade/tests/**/*.test.ts',
      'limiter/tests/**/*.test.ts',
      'quarantine/tests/**/*.test.ts',
      'resilience/tests/**/*.test.ts',
      'sentinel/tests/**/*.test.ts',
      'wiring/tests/**/*.test.ts',
      'src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    testTimeout: 30000,
    hookTimeout: 10000,
  },
});