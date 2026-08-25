import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pointr } from '@pointr/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    pointr(), // injects data-pointr-source on all JSX elements
  ],
});
