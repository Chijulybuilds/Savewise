import crypto from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from './AppError.js';

/**
 * Token minting and verification.
 *
 * Two token types with separate secrets and separate lifetimes:
 *
 * - **Access token** — short-lived (15m), carries the user id, verified on
 *   every request. Never persisted server-side.
 * - **Refresh token** — long-lived (30d), carries a random session id, and is
 *   stored *hashed* so a database dump cannot be replayed as a login.
 *
 * Both travel in httpOnly cookies, so no token is ever readable by page
 * JavaScript and an XSS foothold cannot walk away with a session.
 */

export interface AccessTokenPayload {
  sub: string;
  /** Token type, checked on verify so a refresh token cannot be used as access. */
  typ: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  /** Identifies the session document this token belongs to. */
  sid: string;
  typ: 'refresh';
}

export function signAccessToken(userId: string): string {
  const payload: AccessTokenPayload = { sub: userId, typ: 'access' };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: 'savewise',
    audience: 'savewise-app',
  } as SignOptions);
}

export function signRefreshToken(userId: string, sessionId: string): string {
  const payload: RefreshTokenPayload = { sub: userId, sid: sessionId, typ: 'refresh' };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: 'savewise',
    audience: 'savewise-app',
  } as SignOptions);
}

function verify<T>(token: string, secret: string, expectedType: 'access' | 'refresh'): T {
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: 'savewise',
      audience: 'savewise-app',
    });

    if (typeof decoded === 'string' || decoded.typ !== expectedType) {
      throw AppError.unauthenticated('Your session is no longer valid');
    }

    return decoded as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Deliberately uniform: distinguishing "expired" from "malformed" tells an
    // attacker whether they hold a real token.
    throw AppError.unauthenticated('Your session has expired. Please sign in again.');
  }
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return verify<AccessTokenPayload>(token, env.JWT_SECRET, 'access');
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return verify<RefreshTokenPayload>(token, env.JWT_REFRESH_SECRET, 'refresh');
}

/**
 * Refresh tokens are stored as a SHA-256 digest. Unlike a password, a refresh
 * token is already high-entropy random, so a fast hash is appropriate — bcrypt
 * would add latency to every silent renewal for no additional protection.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function randomId(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/** Parse `15m` / `30d` / `900000` into milliseconds, for cookie `maxAge`. */
export function durationToMs(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d|w|y)?$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration: ${duration}`);

  const value = Number(match[1]);
  const unit = match[2] ?? 'ms';
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_536_000_000,
  };
  return value * (multipliers[unit] ?? 1);
}
