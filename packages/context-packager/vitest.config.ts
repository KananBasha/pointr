import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'context-packager',
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      thresholds: { branches: 85, functions: 90, lines: 90 },
    },
  },
});
