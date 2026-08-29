import { defineConfig } from 'tsup';

/**
 * `@savewise/shared` is published as TypeScript source, so it is bundled into
 * the server output rather than resolved at runtime. Everything in
 * `node_modules` stays external — bundling Express or Mongoose would be slower
 * to build and harder to debug for no benefit.
 */
export default defineConfig({
  entry: ['src/server.ts', 'src/scripts/seed.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  sourcemap: true,
  clean: true,
  splitting: false,
  noExternal: ['@savewise/shared'],
});
