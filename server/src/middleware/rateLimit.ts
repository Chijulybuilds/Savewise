import crypto from 'node:crypto';

import type { Request } from 'express';
import rateLimit, { type Options } from 'express-rate-limit';

import type { ApiErrorBody } from '@savewise/shared';

import { env, isTest } from '../config/env.js';

/**
 * Rate limiting.
 *
 * Three tiers, because the threat models differ:
 *
 * - **api** — a wide limit that catches runaway clients and scrapers.
 * - **auth** — tight, and keyed on *email + IP* rather than IP alone. Keying on
 *   IP only lets one attacker behind a shared NAT lock out an entire office;
 *   keying on email only lets an attacker lock a victim out of their own
 *   account. The pair throttles credential stuffing without either side effect.
 * - **write** — a middle tier for mutations, so a loop cannot fill the database.
 *
 * A production deployment behind several instances would move the store to
 * Redis; the in-memory default is honest for a single-process portfolio API and
 * is noted as such in the README.
 */

const sharedOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Disabled under test so the suite can exercise auth failures without
  // tripping the limiter it is not testing.
  skip: () => isTest,
  handler: (_req, res, _next, options) => {
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
      },
    };
    res.status(options.statusCode).json(body);
  },
};

export const apiRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

export const authRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: (req: Request) => {
    // Express types `req.body` as `any`; narrow it before touching it.
    const body = req.body as { email?: unknown } | undefined;
    const email = typeof body?.email === 'string' ? body.email.toLowerCase().trim() : '';
    // The email is hashed so the limiter's key space never holds raw addresses.
    const identity = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
    return `${req.ip ?? 'unknown'}:${identity}`;
  },
  // Successful sign-ins do not count, so a legitimate user who mistypes twice
  // and then succeeds is not penalised.
  skipSuccessfulRequests: true,
});

export const writeRateLimit = rateLimit({
  ...sharedOptions,
  windowMs: 60_000,
  limit: 60,
});
