import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @omega/mycelium to source files directly (mycelium is FROZEN at v3.30.0)
      // This allows vitest to work without requiring tsc compilation
      "@omega/mycelium": resolve(__dirname, "../mycelium/src/index.ts"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
    },
  },
});
