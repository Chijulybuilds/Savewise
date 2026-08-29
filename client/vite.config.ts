/// <reference types="vitest" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  // A single `.env` at the repo root serves both workspaces.
  envDir: path.resolve(rootDir, '..'),

  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'src'),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
  },

  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        /**
         * Split the heavy, rarely-changing dependencies into their own chunks.
         * Recharts and Motion together are the bulk of the JavaScript weight,
         * and the marketing pages should not have to parse the charting library
         * to render a hero section.
         */
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['motion'],
        },
      },
    },
  },

  test: {
    name: 'client',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
