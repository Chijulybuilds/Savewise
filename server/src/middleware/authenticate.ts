import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { User, type UserDocument } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { ACCESS_TOKEN_COOKIE, readSignedCookie } from '../utils/cookies.js';
import { asyncHandler } from '../utils/http.js';
import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Authentication middleware.
 *
 * Reads the access token from the signed, httpOnly cookie, verifies it, loads
 * the user and attaches both to `req.auth`. Every protected route goes through
 * here; nothing downstream ever has to think about tokens again.
 *
 * The user document is loaded rather than trusting the token payload alone, so
 * a deleted account cannot keep making requests until its token expires.
 */
async function authenticateRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) throw AppError.unauthenticated();

    const payload = verifyAccessToken(token);

    const user = await User.findById(payload.sub).exec();
    if (!user) throw AppError.unauthenticated('Your session is no longer valid');

    req.auth = { userId: user.id as string, user };
    next();
  } catch (error) {
    next(error);
  }
}

async function optionalAuthenticateRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).exec();
      if (user) req.auth = { userId: user.id as string, user };
    }
  } catch {
    // An invalid token is simply "not signed in" on an optional route.
  }
  next();
}

/**
 * The cookie is the supported transport. A bearer header is accepted too so the
 * API stays usable from curl and Postman while documenting the API — but it is
 * only read when no cookie is present, so it can never be used to override an
 * existing session.
 */
function extractToken(req: Request): string | null {
  const cookieToken = readSignedCookie(
    req.signedCookies as Record<string, string>,
    ACCESS_TOKEN_COOKIE,
  );
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim() || null;

  return null;
}

/**
 * Exported wrapped, so Express sees a synchronous `RequestHandler`.
 *
 * Mounting a raw `async` function as middleware is the classic Express 4 trap:
 * a rejected promise never reaches the error handler and the request hangs
 * until the client gives up. Wrapping here means no route can make that mistake.
 */
export const authenticate: RequestHandler = asyncHandler(authenticateRequest);

/**
 * Populates `req.auth` when a valid session exists but never rejects.
 * Used by routes that behave differently for signed-in users without requiring it.
 */
export const optionalAuthenticate: RequestHandler = asyncHandler(optionalAuthenticateRequest);

/** Narrowing helper — throws rather than returning `undefined`, so services get a definite user. */
export function requireAuth(req: Request): { userId: string; user: UserDocument } {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
}
