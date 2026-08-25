import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'overlay',
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      thresholds: { branches: 75, functions: 80, lines: 80 },
    },
  },
});
