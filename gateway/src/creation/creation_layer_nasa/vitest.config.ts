import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["*.ts"],
      exclude: ["*.test.ts", "vitest.config.ts"],
    },
    // Determinism: fixed seed for any randomness
    sequence: {
      seed: 20260104,
    },
    // Timeout for tests
    testTimeout: 30000,
    // Fail on first error for NASA-grade
    bail: 1,
  },
});
