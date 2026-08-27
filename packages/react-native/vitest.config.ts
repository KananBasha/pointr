import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "react-native",
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      thresholds: { branches: 80, functions: 80, lines: 80 },
    },
  },
});
