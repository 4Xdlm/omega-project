import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@omega/omega-observability': resolve(__dirname, 'packages/omega-observability/src/index.ts'),
      '@omega/search': resolve(__dirname, 'packages/search/src/index.ts'),
      '@omega/oracle': resolve(__dirname, 'packages/oracle/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
      'tests/scribe/*_test.ts',
      'test/**/*.test.ts',
      'gateway/tests/**/*.test.ts',
      'gateway/cli-runner/tests/**/*.test.ts',
      'packages/mycelium-bio/tests/**/*.test.ts',
      'packages/omega-bridge-ta-mycelium/tests/**/*.test.ts',
      'packages/omega-segment-engine/tests/**/*.test.ts',
      'packages/omega-aggregate-dna/tests/**/*.test.ts',
      'packages/omega-observability/tests/**/*.test.ts',
      'packages/search/tests/**/*.test.ts',
      'nexus/atlas/tests/**/*.test.ts',
      'nexus/raw/tests/**/*.test.ts',
      'nexus/proof-utils/tests/**/*.test.ts',
      'packages/schemas/__tests__/**/*.test.ts',
      'tools/omega-verify/__tests__/**/*.test.ts',
      'packages/hostile/__tests__/**/*.test.ts',
      'packages/trust-version/__tests__/**/*.test.ts',
      'packages/sbom/__tests__/**/*.test.ts',
      '*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/omega-ui/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'json-summary'],
      include: ['nexus/**/*.ts', 'packages/**/*.ts', 'gateway/**/*.ts', 'src/**/*.ts'],
      exclude: [
        '**/*.test.ts',
        '**/*.bench.ts',
        '**/node_modules/**',
        '**/dist/**',
        'nexus/bench/**',
        'scripts/**',
        '**/__mocks__/**',
      ],
    },
    testTimeout: 15000,
  },
});
