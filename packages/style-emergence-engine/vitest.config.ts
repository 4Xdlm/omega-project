import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@omega/canon-kernel': path.resolve(__dirname, '../canon-kernel/src/index.ts'),
      '@omega/genesis-planner': path.resolve(__dirname, '../genesis-planner/src/index.ts'),
      '@omega/scribe-engine': path.resolve(__dirname, '../scribe-engine/src/index.ts'),
    },
  },
});
