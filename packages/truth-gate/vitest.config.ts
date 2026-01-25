import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/index.ts'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@omega/canon-kernel': path.resolve(__dirname, '../canon-kernel/src/index.ts'),
      '@omega/canon-engine': path.resolve(__dirname, '../canon-engine/src/index.ts'),
    },
  },
});
