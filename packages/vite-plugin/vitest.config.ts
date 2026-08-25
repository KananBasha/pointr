import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'vite-plugin',
    environment: 'node',
    coverage: {
      provider: 'v8',
      thresholds: { branches: 100, functions: 100, lines: 100 },
    },
  },
});
