import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['ipc/tests/**/*.test.ts'],
    testTimeout: 30000, // 30s for IPC tests
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'forks', // Isolate tests with child processes
    poolOptions: {
      forks: {
        singleFork: true // Run sequentially for IPC
      }
    },
    sequence: {
      shuffle: false // Deterministic order
    }
  },
  resolve: {
    alias: {
      '@': '/ipc'
    }
  }
});
