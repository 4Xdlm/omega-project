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
      '@omega/genesis-planner': path.resolve(__dirname, '../genesis-planner/dist/index.js'),
      '@omega/scribe-engine': path.resolve(__dirname, '../scribe-engine/dist/index.js'),
      '@omega/style-emergence-engine': path.resolve(__dirname, '../style-emergence-engine/dist/index.js'),
      '@omega/creation-pipeline': path.resolve(__dirname, '../creation-pipeline/dist/index.js'),
      '@omega/omega-forge': path.resolve(__dirname, '../omega-forge/dist/index.js'),
    },
  },
});
