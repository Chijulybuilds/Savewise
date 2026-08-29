import path from 'node:path';
import process from 'node:process';

import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Environment configuration.
 *
 * The process refuses to start on invalid configuration. A fintech service that
 * boots with an empty `JWT_SECRET` and only discovers it on the first login is
 * strictly worse than one that never boots — so this module validates
 * everything up front and exports a frozen, fully typed object.
 */

// A single `.env` at the repo root serves both workspaces. Whichever directory
// the process was started from, one of these paths finds it.
dotenv.config({
  path: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../.env')],
  quiet: true,
});

const MIN_SECRET_LENGTH = 32;

const secretSchema = (name: string) =>
  z
    .string({ required_error: `${name} is required` })
    .min(
      MIN_SECRET_LENGTH,
      `${name} must be at least ${MIN_SECRET_LENGTH} characters — try: openssl rand -base64 48`,
    );

const booleanSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const durationSchema = z
  .string()
  .regex(/^\d+(ms|s|m|h|d|w|y)?$/, 'Expected a duration like `15m`, `30d` or `900000`');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),

    MONGODB_URI: z
      .string({ required_error: 'MONGODB_URI is required' })
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string',
      ),

    JWT_SECRET: secretSchema('JWT_SECRET'),
    JWT_REFRESH_SECRET: secretSchema('JWT_REFRESH_SECRET'),
    JWT_EXPIRES_IN: durationSchema.default('15m'),
    JWT_REFRESH_EXPIRES_IN: durationSchema.default('30d'),

    COOKIE_SECRET: secretSchema('COOKIE_SECRET'),
    COOKIE_SECURE: booleanSchema.default('false'),
    COOKIE_DOMAIN: z.string().optional(),

    CLIENT_URL: z.string().default('http://localhost:5173'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

    SEED_DEMO_EMAIL: z.string().email().default('demo@savewise.local'),
    SEED_DEMO_PASSWORD: z.string().min(10).default('DemoPassword123!'),
  })
  .superRefine((value, ctx) => {
    if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_SECRET',
      });
    }
    if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message:
          'COOKIE_SECURE must be true in production — auth cookies would otherwise travel over plain HTTP',
      });
    }
  });

/**
 * In `test` the suite spins up an in-memory MongoDB and needs no operator
 * input, so we supply throwaway secrets rather than requiring a `.env`.
 */
function testDefaults(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    MONGODB_URI: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/savewise-test',
    JWT_SECRET: 'test-access-secret-that-is-long-enough-000000',
    JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-11111',
    COOKIE_SECRET: 'test-cookie-secret-that-is-long-enough-222222',
    LOG_LEVEL: 'silent',
  };
}

function loadEnv() {
  const source =
    process.env.NODE_ENV === 'test' ? { ...testDefaults(), ...process.env } : process.env;
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');

    // Written directly to stderr: the logger itself depends on this config.
    process.stderr.write(
      `\nSavewise cannot start — invalid environment configuration:\n\n${problems}\n\n` +
        `Copy .env.example to .env and fill in the missing values.\n\n`,
    );
    process.exit(1);
  }

  return Object.freeze(parsed.data);
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

/** Origins permitted to make credentialed cross-origin requests. */
export const allowedOrigins = env.CLIENT_URL.split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
