import pino from 'pino';

import { env, isDevelopment, isTest } from './env.js';

/**
 * Structured logging.
 *
 * JSON in production so a log pipeline can index it; pretty-printed in
 * development so a human can read it; silent under test so the suite output
 * stays legible.
 *
 * The redaction list is the important part: this is a financial application and
 * accidentally logging a password, a JWT or a session cookie turns a debug line
 * into a breach.
 */
export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'newPassword',
      'currentPassword',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      'token',
      'refreshToken',
      'accessToken',
    ],
    censor: '[redacted]',
  },
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
});

export type Logger = typeof logger;
