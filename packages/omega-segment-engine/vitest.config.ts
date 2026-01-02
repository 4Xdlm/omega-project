import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts"],
    },
    // NASA-grade: pas de timeout sur les tests de déterminisme
    testTimeout: 30000,
    // Rapport détaillé
    reporters: ["verbose"],
  },
});
