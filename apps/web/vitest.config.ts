import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // Only unit tests. The e2e/ folder holds Playwright specs, which use a different runner.
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      // Report on everything Sonar analyses. A narrower include only hides the gap: files missing
      // from lcov are still counted as uncovered on the Sonar side, so the number looked better
      // here than it really was.
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Type declarations carry no executable code.
        "src/types/**",
        // Vendored shadcn/ui primitives, taken as-is and exercised through the screens that use them.
        "src/components/ui/**",
        "src/**/*.test.{ts,tsx}",
      ],
    },
  },
});
