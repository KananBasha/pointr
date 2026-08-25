import { defineConfig } from 'tsup';
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['iife'],
  globalName: '__pointr',
  minify: true,
  sourcemap: false,
  clean: true,
  outExtension: () => ({ js: '.iife.js' }),
  // No external deps — must be fully self-contained
});
