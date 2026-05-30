import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // ollama-integration.test.ts = script manuel (npx tsx), pas une suite vitest -> exclu du gate (P3-T1, 2026-05-30)
    exclude: [...configDefaults.exclude, 'tests/ollama-integration.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@omega/canon-kernel': path.resolve(__dirname, '../canon-kernel/src/index.ts'),
      '@omega/genesis-planner': path.resolve(__dirname, '../genesis-planner/src/index.ts'),
    },
  },
});
