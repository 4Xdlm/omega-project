import { defineConfig } from 'vitest/config';
import path from 'path';

// P0.6 probe runs entirely from SOURCE via aliases — no build/install of the
// consumed packages is required, and nothing in them is mutated.
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
      '@omega/truth-gate': path.resolve(__dirname, '../truth-gate/src/index.ts'),
    },
  },
});
