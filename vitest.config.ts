import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/plugin-sdk/src/__tests__/**/*.test.ts',
      'plugins/p.sample.neutral/tests/**/*.test.ts',
    ],
    globals: false,
    testTimeout: 15000,
  },
});
