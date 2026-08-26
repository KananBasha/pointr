import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "vscode-extension",
    environment: "node",
  },
});
