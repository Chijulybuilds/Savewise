import type { Request, Response } from 'express';

import type {
  ChangePasswordInput,
  OnboardingInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as userService from '../services/user.service.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { sendSuccess } from '../utils/http.js';

export async function getProfile(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { user: await userService.getProfile(userId) });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const user = await userService.updateProfile(userId, req.body as UpdateProfileInput);
  sendSuccess(res, { user });
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const user = await userService.updatePreferences(userId, req.body as UpdatePreferencesInput);
  sendSuccess(res, { user });
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await userService.changePassword(userId, req.body as ChangePasswordInput);

  // Every session was just revoked, this one included — clear the cookies so
  // the client redirects to sign-in instead of retrying with dead tokens.
  clearAuthCookies(res);
  sendSuccess(res, { message: 'Password updated. Please sign in again.' });
}

export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const result = await userService.completeOnboarding(userId, req.body as OnboardingInput);
  sendSuccess(res, result);
}
