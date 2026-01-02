import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'tests/**/*.test.ts',
      'gateway/tests/**/*.test.ts',
      'packages/mycelium-bio/tests/**/*.test.ts',
      'packages/omega-bridge-ta-mycelium/tests/**/*.test.ts',
      'packages/omega-segment-engine/tests/**/*.test.ts',
      'packages/omega-aggregate-dna/tests/**/*.test.ts',
      '*.test.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/omega-ui/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 10000,
  },
});
