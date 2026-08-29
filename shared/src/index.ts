/**
 * `@savewise/shared` — the contract between the API and the web client.
 *
 * Consumed as TypeScript source (no build step): `tsx` and `tsup` compile it
 * for the server, Vite compiles it for the browser. One definition of a naira,
 * one definition of a savings rate, one definition of a valid request.
 */

export * from './money.js';
export * from './period.js';
export * from './constants.js';
export * from './finance.js';
export * from './types.js';
export * from './schemas/index.js';
