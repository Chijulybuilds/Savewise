import type { Request, Response } from 'express';

import type { AuthResultDto, LoginInput, RegisterInput } from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as authService from '../services/auth.service.js';
import { toUserDto } from '../services/mappers.js';
import { AppError } from '../utils/AppError.js';
import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  readSignedCookie,
  setAuthCookies,
} from '../utils/cookies.js';
import { sendCreated, sendSuccess } from '../utils/http.js';

/**
 * Authentication endpoints.
 *
 * Controllers stay thin on purpose: read the validated input, call a service,
 * shape the HTTP response. The one thing they own that services do not is the
 * cookie — token transport is an HTTP concern and stays at this layer.
 *
 * Note that no token ever appears in a response body. They travel exclusively
 * in httpOnly cookies, so the browser cannot read them and neither can an
 * injected script.
 */

export async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterInput;
  const result = await authService.register(input, context(req));

  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendCreated<AuthResultDto>(res, { user: result.user });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = req.body as LoginInput;
  const result = await authService.login(input, context(req));

  setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess<AuthResultDto>(res, { user: result.user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = readSignedCookie(req.signedCookies as Record<string, string>, REFRESH_TOKEN_COOKIE);
  if (!token) {
    // Clear any stale access cookie so the client stops retrying with it.
    clearAuthCookies(res);
    throw AppError.unauthenticated('Please sign in to continue');
  }

  try {
    const result = await authService.refresh(token, context(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess<AuthResultDto>(res, { user: result.user });
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = readSignedCookie(req.signedCookies as Record<string, string>, REFRESH_TOKEN_COOKIE);
  await authService.logout(token);

  clearAuthCookies(res);
  sendSuccess(res, { message: 'Signed out' });
}

export function me(req: Request, res: Response): void {
  const { user } = requireAuth(req);
  sendSuccess<AuthResultDto>(res, { user: toUserDto(user) });
}

function context(req: Request): authService.SessionContext {
  return { userAgent: req.get('user-agent') ?? undefined, ip: req.ip };
}
