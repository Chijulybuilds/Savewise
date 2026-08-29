import type { CookieOptions, Response } from 'express';

import { env, isProduction } from '../config/env.js';
import { durationToMs } from './tokens.js';

/**
 * Auth cookie policy.
 *
 * - `httpOnly` — page JavaScript cannot read the tokens, so XSS cannot steal a session.
 * - `sameSite: 'lax'` in dev (client on :5173, API on :5000 — same site, different port)
 *   and `'strict'` in production, where both are served from one origin. Either way
 *   a cross-site form post cannot carry the cookie.
 * - `secure` — required in production; the env schema refuses to boot without it.
 * - `signed` — tampering with the cookie value invalidates it before it is parsed.
 * - The refresh cookie is scoped to `/api/auth`, so it is not attached to the
 *   hundreds of ordinary API calls that have no business seeing it.
 */

export const ACCESS_TOKEN_COOKIE = 'sw_at';
export const REFRESH_TOKEN_COOKIE = 'sw_rt';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: isProduction ? 'strict' : 'lax',
    signed: true,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseOptions(),
    path: '/',
    maxAge: durationToMs(env.JWT_EXPIRES_IN),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseOptions(),
    path: '/api/auth',
    maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

export function clearAuthCookies(res: Response): void {
  const { maxAge: _ignored, ...options } = baseOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...options, path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...options, path: '/api/auth' });
}

/** Signed cookies land in `req.signedCookies`; an unsigned value is ignored. */
export function readSignedCookie(
  cookies: Record<string, string | false | undefined> | undefined,
  name: string,
): string | null {
  const value = cookies?.[name];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
