/**
 * OMEGA Phase 7 — Vitest Configuration
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Version: 1.2
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000, // 60s for PNG export tests
    hookTimeout: 30000,
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/cli.ts'],
    },
  },
});
