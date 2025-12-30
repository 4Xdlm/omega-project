import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "json"],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 35,
        lines: 40
      }
    }
  }
});
