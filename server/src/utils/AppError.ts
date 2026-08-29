import type { ApiErrorCode } from '@savewise/shared';

/**
 * The one error type the API throws deliberately.
 *
 * Anything else reaching the error handler is a bug and is reported as a
 * generic 500 with no detail — the distinction between "expected failure" and
 * "unexpected failure" is exactly what stops internals leaking to clients.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, string[]> | undefined;
  /** Distinguishes deliberate failures from programmer errors in the handler. */
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, details?: Record<string, string[]>): AppError {
    return new AppError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthenticated(message = 'You need to sign in to continue'): AppError {
    return new AppError(401, 'UNAUTHENTICATED', message);
  }

  static invalidCredentials(message = 'That email or password is incorrect'): AppError {
    return new AppError(401, 'INVALID_CREDENTIALS', message);
  }

  static forbidden(message = 'You do not have access to that'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Resource'): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} not found`);
  }

  static conflict(message: string, details?: Record<string, string[]>): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static unprocessable(message: string, details?: Record<string, string[]>): AppError {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }

  static rateLimited(message = 'Too many requests. Please try again shortly.'): AppError {
    return new AppError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong on our end'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
