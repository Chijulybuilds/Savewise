import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';

import type { LoginInput, RegisterInput, UserDto } from '@savewise/shared';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Session } from '../models/Session.js';
import { User, type UserDocument } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import {
  durationToMs,
  hashToken,
  randomId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { toUserDto } from './mappers.js';

/**
 * Authentication.
 *
 * Sessions use rotating refresh tokens: each refresh mints a new token, retires
 * the old one and records the succession. Presenting a retired token means it
 * was copied, so the whole rotation family is revoked — a stolen token buys an
 * attacker one request, and costs them the session.
 */

export interface SessionContext {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: UserDto;
}

/**
 * A bcrypt hash of a throwaway value, compared against when no account matches.
 * Without it, a missing email returns in ~1ms and a wrong password in ~250ms —
 * a timing gap that enumerates registered users. Comparing regardless keeps
 * both paths the same shape.
 */
const TIMING_DECOY_HASH = bcrypt.hashSync('savewise-timing-equaliser', 10);

export async function register(input: RegisterInput, context: SessionContext): Promise<AuthResult> {
  const passwordHash = await User.hashPassword(input.password);

  let user: UserDocument;
  try {
    user = await User.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      currency: input.currency,
      // A registration payload cannot set income, preferences or onboarding
      // state. Those are established through their own, authenticated flows.
    });
  } catch (error) {
    if (isDuplicateEmail(error)) {
      throw AppError.conflict('An account with that email already exists', {
        email: ['An account with that email already exists'],
      });
    }
    throw error;
  }

  const tokens = await issueSession(user, randomId(16), context);
  logger.info({ userId: user.id }, 'Account created');

  return { ...tokens, user: toUserDto(user) };
}

export async function login(input: LoginInput, context: SessionContext): Promise<AuthResult> {
  const user = await User.findByEmailWithPassword(input.email);

  // Always run a comparison so response time does not reveal whether the
  // account exists.
  const passwordMatches = user
    ? await user.verifyPassword(input.password)
    : await bcrypt.compare(input.password, TIMING_DECOY_HASH).then(() => false);

  if (!user || !passwordMatches) {
    // Deliberately identical for both causes — "no such user" is information.
    throw AppError.invalidCredentials();
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueSession(user, randomId(16), context);
  logger.info({ userId: user.id }, 'Signed in');

  return { ...tokens, user: toUserDto(user) };
}

/**
 * Exchange a refresh token for a fresh pair.
 *
 * The presented token must exist, be unrevoked and be unexpired. Anything else
 * is treated as hostile.
 */
export async function refresh(refreshToken: string, context: SessionContext): Promise<AuthResult> {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const session = await Session.findOne({ tokenHash }).exec();

  if (!session) {
    // A signature-valid token with no session row was already rotated away and
    // pruned, or forged. Either way, refuse.
    throw AppError.unauthenticated('Your session has expired. Please sign in again.');
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    // Reuse of a retired token: the credential is loose. Burn the whole family
    // so both the attacker's copy and the victim's are worthless.
    await Session.updateMany(
      { family: session.family, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    ).exec();

    logger.warn(
      { userId: session.userId.toString(), family: session.family },
      'Refresh token reuse detected — session family revoked',
    );
    throw AppError.unauthenticated('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub).exec();
  if (!user) throw AppError.unauthenticated('Your session is no longer valid');

  const tokens = await issueSession(user, session.family, context);

  // Retire the presented token only after its successor exists, so a failure
  // mid-rotation cannot leave the user with no valid token at all.
  session.revokedAt = new Date();
  session.replacedBy = hashToken(tokens.refreshToken);
  await session.save();

  return { ...tokens, user: toUserDto(user) };
}

/** Revoke the presented session. Absent or invalid tokens are a silent no-op. */
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  await Session.updateOne(
    { tokenHash: hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  ).exec();
}

/** Revoke every session for a user — used after a password change. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } }).exec();
}

async function issueSession(
  user: UserDocument,
  family: string,
  context: SessionContext,
): Promise<AuthTokens> {
  const sessionId = randomId(12);
  const refreshToken = signRefreshToken(user.id as string, sessionId);

  await Session.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    userAgent: context.userAgent?.slice(0, 256) ?? null,
    ipHash: context.ip ? crypto.createHash('sha256').update(context.ip).digest('hex') : null,
  });

  return { accessToken: signAccessToken(user.id as string), refreshToken };
}

function isDuplicateEmail(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
