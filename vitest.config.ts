import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["extensions/**/*.test.ts"],
    coverage: {
      include: ["extensions/**/*.ts"],
      exclude: ["extensions/**/*.test.ts", "extensions/index.ts"],
      thresholds: { lines: 85, branches: 85, functions: 80, statements: 85 }
    }
  }
});
