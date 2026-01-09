import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@omega/mycelium": resolve(__dirname, "../../packages/mycelium/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.bench.ts"],
    testTimeout: 60000, // Allow longer timeout for benchmarks
  },
});
