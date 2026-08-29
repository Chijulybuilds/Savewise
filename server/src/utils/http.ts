import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { ApiSuccess } from '@savewise/shared';

/**
 * HTTP plumbing shared by every controller.
 */

/**
 * Express 4 does not forward rejected promises to the error middleware, so
 * every async handler is wrapped. Without this, one unhandled rejection is a
 * request that hangs until the client times out.
 */
/**
 * A handler that may return a promise.
 *
 * Express's own `RequestHandler` returns `void`, so passing an async function
 * where one is expected is exactly the mistake `no-misused-promises` exists to
 * catch. Typing the input explicitly means `asyncHandler` is the one sanctioned
 * place an async handler is accepted — and it always attaches a `.catch`.
 */
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/** Every successful response has the same shape: `{ success: true, data }`. */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function sendCreated<T>(res: Response, data: T): void {
  sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}
