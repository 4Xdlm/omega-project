import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/index.ts',
        'src/**/types.ts',        // Pure type definitions
        'src/**/types-*.ts',      // Pure type definitions
      ],
      thresholds: {
        statements: 95,
        branches: 85,
        functions: 90,
        lines: 95
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});
