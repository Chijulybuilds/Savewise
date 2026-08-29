import type {
  AuthResultDto,
  ChangePasswordInput,
  LoginInput,
  OnboardingInput,
  RegisterInput,
  StartingPlan,
  UpdatePreferencesInput,
  UpdateProfileInput,
  UserDto,
} from '@savewise/shared';

import { get, patch, post } from './api';

/**
 * Authentication and profile.
 *
 * No token handling appears anywhere in this file — the server sets and clears
 * httpOnly cookies, and the browser attaches them. The client's only notion of
 * "signed in" is whether `/auth/me` returns a user.
 */

export const authService = {
  register(input: RegisterInput): Promise<AuthResultDto> {
    return post<AuthResultDto>('/auth/register', input);
  },

  login(input: LoginInput): Promise<AuthResultDto> {
    return post<AuthResultDto>('/auth/login', input);
  },

  logout(): Promise<{ message: string }> {
    return post<{ message: string }>('/auth/logout');
  },

  me(): Promise<AuthResultDto> {
    return get<AuthResultDto>('/auth/me');
  },

  changePassword(input: ChangePasswordInput): Promise<{ message: string }> {
    return post<{ message: string }>('/auth/change-password', input);
  },

  updateProfile(input: UpdateProfileInput): Promise<{ user: UserDto }> {
    return patch<{ user: UserDto }>('/users/me', input);
  },

  updatePreferences(input: UpdatePreferencesInput): Promise<{ user: UserDto }> {
    return patch<{ user: UserDto }>('/users/me/preferences', input);
  },

  completeOnboarding(input: OnboardingInput): Promise<{
    user: UserDto;
    plan: StartingPlan;
    budgetCreated: boolean;
    goalCreated: boolean;
  }> {
    return post('/users/me/onboarding', input);
  },
};
