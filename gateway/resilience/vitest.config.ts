import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      }
    },
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    sequence: {
      shuffle: false
    },
    reporters: ['verbose'],
    outputFile: {
      json: './test-results.json'
    }
  },
  resolve: {
    alias: {
      '@': '/home/claude/omega-phase23/gateway/resilience/src'
    }
  }
});
