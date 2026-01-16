import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for OMEGA UI tests
 * @module vitest.config
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
