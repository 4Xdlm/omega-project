import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @omega/mycelium to source files directly (FROZEN at v3.30.0)
      "@omega/mycelium": resolve(__dirname, "../../packages/mycelium/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
    testTimeout: 30000,
  },
});
