import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

import type { ApiErrorBody } from '@savewise/shared';

import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError, isAppError } from '../utils/AppError.js';

/**
 * Centralised error handling — the single place any failure becomes a response.
 *
 * Known failure modes are translated into the documented error envelope.
 * Everything else becomes an opaque 500: a stack trace, a Mongo error string or
 * a duplicate-key detail can each disclose schema internals, so in production
 * they are logged and never sent.
 */

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.path}`));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // Express identifies error middleware by arity — the fourth parameter must stay.
  _next: NextFunction,
): void {
  const normalised = normalise(error);

  const logPayload = {
    err: error,
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: normalised.statusCode,
    code: normalised.code,
  };

  if (normalised.statusCode >= 500) {
    logger.error(logPayload, 'Unhandled request error');
  } else {
    logger.warn(logPayload, 'Request rejected');
  }

  const responseBody: ApiErrorBody = {
    success: false,
    error: {
      code: normalised.code,
      message: normalised.message,
      details: normalised.details,
    },
  };

  // A stack trace is invaluable locally and a disclosure risk in production.
  if (!isProduction && normalised.statusCode >= 500 && error instanceof Error) {
    (responseBody.error as Record<string, unknown>).stack = error.stack;
  }

  res.status(normalised.statusCode).json(responseBody);
}

function normalise(error: unknown): AppError {
  if (isAppError(error)) return error;

  // Validation that reached the service layer rather than the route middleware.
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || '_';
      (details[key] ??= []).push(issue.message);
    }
    return AppError.badRequest('Please check the highlighted fields', details);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string[]> = {};
    for (const [path, issue] of Object.entries(error.errors)) {
      details[path] = [issue.message];
    }
    return AppError.unprocessable('Please check the highlighted fields', details);
  }

  // A malformed ObjectId in a path parameter is a 404, not a 500 — the resource
  // genuinely does not exist, and saying "invalid cast" leaks the storage layer.
  if (error instanceof mongoose.Error.CastError) {
    return AppError.notFound('Resource');
  }

  if (isDuplicateKeyError(error)) {
    return AppError.conflict(duplicateKeyMessage(error));
  }

  if (error instanceof SyntaxError && 'body' in error) {
    return AppError.badRequest('The request body is not valid JSON');
  }

  if (isPayloadTooLarge(error)) {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'That request is too large');
  }

  return AppError.internal();
}

interface MongoServerError {
  code: number;
  keyPattern?: Record<string, unknown>;
}

function isDuplicateKeyError(error: unknown): error is MongoServerError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}

/**
 * Duplicate-key messages are written by hand rather than echoing the index
 * name, which would expose the schema. Anything unrecognised gets generic copy.
 */
function duplicateKeyMessage(error: MongoServerError): string {
  const keys = Object.keys(error.keyPattern ?? {});
  if (keys.includes('email')) return 'An account with that email already exists';
  if (keys.includes('month')) return 'A budget already exists for that month';
  if (keys.includes('name')) return 'You already have an item with that name';
  return 'That already exists';
}

function isPayloadTooLarge(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  );
}
