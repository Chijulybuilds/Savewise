import crypto from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

/**
 * Attaches a correlation id to every request and echoes it back.
 *
 * When a user reports "it failed at 14:32", the id in their response header
 * finds the exact log lines. An inbound `x-request-id` is honoured so a trace
 * survives a proxy hop, but is length-capped and stripped of anything that
 * could smuggle a newline into the logs.
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const candidate = Array.isArray(inbound) ? inbound[0] : inbound;

  req.id =
    typeof candidate === 'string' && /^[\w-]{1,64}$/.test(candidate)
      ? candidate
      : crypto.randomUUID();

  res.setHeader('x-request-id', req.id);
  next();
}
