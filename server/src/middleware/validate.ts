import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { type ZodError, type ZodTypeAny } from 'zod';

import { AppError } from '../utils/AppError.js';

/**
 * Request validation.
 *
 * Every mutating route runs its body through a Zod schema *before* a controller
 * sees it, and the parsed result **replaces** the raw input. Two consequences
 * matter:
 *
 * 1. Unknown keys are gone. Combined with `.strict()` schemas, a client cannot
 *    smuggle `role`, `userId` or `currentAmount` into an update.
 * 2. Downstream code receives values already coerced to their correct types, so
 *    a controller never re-parses a date or trusts a string that should be a
 *    number.
 */

type Source = 'body' | 'query' | 'params';

function formatIssues(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

function validateSource<T extends ZodTypeAny>(schema: T, source: Source): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(
        AppError.badRequest(
          source === 'params' ? 'Invalid request path' : 'Please check the highlighted fields',
          formatIssues(result.error),
        ),
      );
      return;
    }

    // `req.query` and `req.params` have getter-only definitions in Express 5 and
    // read-only typings in Express 4; assigning through a cast is the supported
    // way to hand the sanitised value downstream.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}

export function validateBody<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validateSource(schema, 'body');
}

export function validateQuery<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validateSource(schema, 'query');
}

export function validateParams<T extends ZodTypeAny>(schema: T): RequestHandler {
  return validateSource(schema, 'params');
}

