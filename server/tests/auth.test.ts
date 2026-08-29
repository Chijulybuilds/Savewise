import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { User } from '../src/models/User.js';
import { Session } from '../src/models/Session.js';
import {
  clearDatabase,
  createTestUser,
  startTestDatabase,
  stopTestDatabase,
  testApp,
} from './helpers.js';

/**
 * Authentication.
 *
 * The assertions that matter most here are the negative ones: that a password
 * is never stored or returned in the clear, that a token never appears in a
 * response body, and that a reused refresh token burns the whole session.
 */

let app: Express;

beforeAll(async () => {
  await startTestDatabase();
  app = testApp();
});

afterAll(stopTestDatabase);
afterEach(clearDatabase);

describe('POST /api/auth/register', () => {
  it('creates an account and sets httpOnly session cookies', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Chinedu',
        lastName: 'Okafor',
        email: 'Chinedu@Example.COM',
        password: 'StrongPassword1',
        currency: 'NGN',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    // The email is normalised on write, so casing cannot create a second account.
    expect(response.body.data.user.email).toBe('chinedu@example.com');

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((cookie) => cookie.startsWith('sw_at='))).toBe(true);
    expect(cookies.some((cookie) => cookie.startsWith('sw_rt='))).toBe(true);
    // Every auth cookie must be unreadable to page scripts.
    expect(cookies.every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
    // The refresh cookie is scoped away from ordinary API calls.
    expect(cookies.find((cookie) => cookie.startsWith('sw_rt='))).toContain('Path=/api/auth');
  });

  it('never returns a password hash or a token in the body', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Eze',
        email: 'ada@example.com',
        password: 'StrongPassword1',
        currency: 'NGN',
      })
      .expect(201);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('StrongPassword1');
    expect(serialised).not.toContain('accessToken');
    expect(serialised).not.toContain('refreshToken');
  });

  it('stores the password only as a bcrypt hash', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Eze',
        email: 'ada@example.com',
        password: 'StrongPassword1',
        currency: 'NGN',
      })
      .expect(201);

    const user = await User.findByEmailWithPassword('ada@example.com');
    expect(user).not.toBeNull();
    expect(user?.passwordHash).not.toBe('StrongPassword1');
    expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(await user?.verifyPassword('StrongPassword1')).toBe(true);
  });

  it('rejects a weak password with field-level detail', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Eze',
        email: 'ada@example.com',
        password: 'short',
        currency: 'NGN',
      })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.password).toBeDefined();
  });

  it('refuses a duplicate email', async () => {
    const payload = {
      firstName: 'Ada',
      lastName: 'Eze',
      email: 'ada@example.com',
      password: 'StrongPassword1',
      currency: 'NGN',
    };

    await request(app).post('/api/auth/register').send(payload).expect(201);
    const response = await request(app).post('/api/auth/register').send(payload).expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('ignores fields a client is not allowed to set', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Ada',
        lastName: 'Eze',
        email: 'ada@example.com',
        password: 'StrongPassword1',
        currency: 'NGN',
        // Mass-assignment attempt: none of these may reach the document.
        monthlyIncome: 999_999_999,
        onboardingCompleted: true,
        role: 'admin',
      })
      .expect(201);

    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user?.monthlyIncome).toBe(0);
    expect(user?.onboardingCompleted).toBe(false);
    expect((user as unknown as { role?: string }).role).toBeUndefined();
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const { email, password } = await createTestUser(app);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.data.user.email).toBe(email);
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const { email } = await createTestUser(app);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'NotThePassword1' })
      .expect(401);

    const unknownUser = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@savewise.test', password: 'NotThePassword1' })
      .expect(401);

    // Identical responses: distinguishing them would enumerate registered users.
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const { agent, email } = await createTestUser(app);
    const response = await agent.get('/api/auth/me').expect(200);
    expect(response.body.data.user.email).toBe(email);
  });

  it('rejects a request with no session', async () => {
    const response = await request(app).get('/api/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a forged token', async () => {
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token')
      .expect(401);
  });
});

describe('refresh token rotation', () => {
  it('issues a new token pair and retires the old one', async () => {
    const { agent } = await createTestUser(app);

    const before = await Session.countDocuments({ revokedAt: null });
    await agent.post('/api/auth/refresh').expect(200);

    const active = await Session.countDocuments({ revokedAt: null });
    const revoked = await Session.countDocuments({ revokedAt: { $ne: null } });

    expect(before).toBe(1);
    expect(active).toBe(1);
    expect(revoked).toBe(1);
  });

  it('revokes the whole session family when a retired token is replayed', async () => {
    const { agent } = await createTestUser(app);

    // Capture the original refresh cookie, then rotate past it.
    const original = await agent.post('/api/auth/refresh').expect(200);
    const staleCookie = (original.headers['set-cookie'] as unknown as string[]).find((cookie) =>
      cookie.startsWith('sw_rt='),
    );
    expect(staleCookie).toBeDefined();

    await agent.post('/api/auth/refresh').expect(200);

    // Replaying the now-superseded token means it was copied.
    await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', staleCookie as string)
      .expect(401);

    // Every session in the chain is burned, so the attacker's copy and the
    // victim's are both worthless.
    expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the session and clears the cookies', async () => {
    const { agent } = await createTestUser(app);

    await agent.post('/api/auth/logout').expect(200);

    expect(await Session.countDocuments({ revokedAt: null })).toBe(0);
    await agent.get('/api/auth/me').expect(401);
  });
});

describe('POST /api/auth/change-password', () => {
  it('requires the current password', async () => {
    const { agent } = await createTestUser(app);

    const response = await agent
      .post('/api/auth/change-password')
      .send({
        currentPassword: 'WrongPassword1',
        newPassword: 'BrandNewPassword1',
        confirmPassword: 'BrandNewPassword1',
      })
      .expect(400);

    expect(response.body.error.details.currentPassword).toBeDefined();
  });

  it('changes the password and revokes every session', async () => {
    const { agent, email, password } = await createTestUser(app);

    await agent
      .post('/api/auth/change-password')
      .send({
        currentPassword: password,
        newPassword: 'BrandNewPassword1',
        confirmPassword: 'BrandNewPassword1',
      })
      .expect(200);

    expect(await Session.countDocuments({ revokedAt: null })).toBe(0);

    await request(app).post('/api/auth/login').send({ email, password }).expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'BrandNewPassword1' })
      .expect(200);
  });
});
