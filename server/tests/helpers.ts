import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';

import { toMinor } from '@savewise/shared';

import { createApp } from '../src/app.js';

/**
 * Integration test harness.
 *
 * The API is exercised over real HTTP against a real MongoDB — an in-memory
 * one, but a genuine `mongod` speaking the wire protocol. Mocking Mongoose
 * would test the mocks: the behaviour worth verifying here (unique indexes,
 * `$inc` atomicity, ownership filters returning nothing for another user) lives
 * in the database, not in the JavaScript above it.
 *
 * `MONGODB_URI` may point at an existing instance instead, which is how the
 * suite runs in CI where downloading a binary is undesirable.
 */

let memoryServer: MongoMemoryServer | null = null;

export async function startTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState === mongoose.ConnectionStates.connected) return;

  let uri = process.env.MONGODB_URI_TEST;

  if (!uri) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
  }

  await mongoose.connect(uri, { dbName: `savewise-test-${Date.now()}` });
}

export async function stopTestDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  await memoryServer?.stop();
  memoryServer = null;
}

/**
 * Empties every collection between tests.
 *
 * Dropping collections instead would also drop their indexes, and half of what
 * these tests verify is index behaviour — the unique constraint on an email, on
 * a budget month, on a goal name.
 */
export async function clearDatabase(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export function testApp(): Express {
  return createApp();
}

export interface TestUser {
  agent: TestAgent;
  email: string;
  password: string;
  userId: string;
}

let userCounter = 0;

/**
 * Registers a user and returns an agent with their session cookies attached.
 *
 * `request.agent` persists cookies across requests, which is exactly how a
 * browser behaves — so these tests exercise the real httpOnly cookie flow
 * rather than a bearer token shortcut that production never uses.
 */
export async function createTestUser(
  app: Express,
  overrides: Partial<{ email: string; password: string; firstName: string }> = {},
): Promise<TestUser> {
  userCounter += 1;
  const email = overrides.email ?? `user${userCounter}.${Date.now()}@savewise.test`;
  const password = overrides.password ?? 'TestPassword123!';

  const agent = request.agent(app);
  const response = await agent
    .post('/api/auth/register')
    .send({
      firstName: overrides.firstName ?? 'Test',
      lastName: 'User',
      email,
      password,
      currency: 'NGN',
    })
    .expect(201);

  return {
    agent,
    email,
    password,
    userId: response.body.data.user.id as string,
  };
}

/**
 * Raw session cookies for a registered user.
 *
 * Supertest's agent serialises requests over one socket, which is fine for
 * ordinary tests and useless for a concurrency test. Signing in once and
 * reusing the cookie header lets several independent connections act as the
 * same user simultaneously.
 */
export async function sessionCookies(app: Express, user: TestUser): Promise<string[]> {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);

  return response.headers['set-cookie'] as unknown as string[];
}

/** A valid goal payload, so individual tests only state what they care about. */
export function goalPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: `Emergency Fund ${Math.random().toString(36).slice(2, 8)}`,
    category: 'emergency',
    targetAmount: toMinor(1_200_000),
    startingAmount: 0,
    monthlyContribution: toMinor(55_000),
    priority: 'high',
    ...overrides,
  };
}

export function transactionPayload(overrides: Record<string, unknown> = {}) {
  return {
    type: 'expense',
    amount: toMinor(25_000),
    category: 'food',
    description: 'Market shopping',
    date: new Date().toISOString(),
    ...overrides,
  };
}

export function budgetPayload(overrides: Record<string, unknown> = {}) {
  return {
    month: '2026-08',
    plannedIncome: toMinor(520_000),
    plannedSavings: toMinor(120_000),
    categories: [
      { category: 'food', budgeted: toMinor(90_000) },
      { category: 'transportation', budgeted: toMinor(55_000) },
    ],
    ...overrides,
  };
}
