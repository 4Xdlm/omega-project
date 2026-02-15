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
      '@omega/genesis-planner': path.resolve(__dirname, '../genesis-planner/src/index.ts'),
      '@omega/genome': path.resolve(__dirname, '../genome/src/index.ts'),
      '@omega/omega-forge': path.resolve(__dirname, '../omega-forge/src/index.ts'),
      '@omega/signal-registry': path.resolve(__dirname, '../signal-registry/src/index.ts'),
    },
  },
});
