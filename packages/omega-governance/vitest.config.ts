import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli/main.ts'],
    },
  },
  resolve: {
    alias: {
      '@omega/canon-kernel': path.resolve(__dirname, '../canon-kernel/dist/index.js'),
    },
  },
});
