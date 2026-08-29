import { defineConfig } from 'vitest/config';

/**
 * Root test runner.
 *
 * One command runs everything: the pure `shared` tests in Node, the API's
 * integration tests against an in-memory MongoDB, and the client's component
 * tests in jsdom. Each project brings its own environment, so `npm test` at the
 * root is the whole suite rather than three commands to remember.
 */
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'shared',
          root: './shared',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'server',
          root: './server',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          // Mongoose model registration and the in-memory server are process
          // wide, so the API tests share one worker rather than racing.
          pool: 'forks',
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
      './client/vite.config.ts',
    ],
  },
});
