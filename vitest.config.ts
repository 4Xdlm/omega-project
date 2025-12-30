import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*_test.ts', '**/*.test.ts'],
    seed: 42,
    sequence: {
      shuffle: false
    },
    testTimeout: 30000,
    reporters: ['verbose']
  }
});
