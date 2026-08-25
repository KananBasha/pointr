import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'mcp-server',
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { branches: 80, functions: 85, lines: 85 },
    },
  },
});
