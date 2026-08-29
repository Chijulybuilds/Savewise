import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { toMinor } from '@savewise/shared';

import {
  budgetPayload,
  clearDatabase,
  createTestUser,
  goalPayload,
  startTestDatabase,
  stopTestDatabase,
  testApp,
  transactionPayload,
} from './helpers.js';

/**
 * Authorization.
 *
 * The single most important property of this API: user A can never see, change
 * or delete anything belonging to user B — even holding a valid session and a
 * correct resource id.
 *
 * Every ownership check is a `userId` in the query filter rather than a
 * post-fetch comparison, so the expected outcome is **404, not 403**. "You are
 * not allowed to see this" confirms the resource exists; "not found" does not.
 */

let app: Express;

beforeAll(async () => {
  await startTestDatabase();
  app = testApp();
});

afterAll(stopTestDatabase);
afterEach(clearDatabase);

describe('cross-account access', () => {
  it('hides another user’s goal from every goal endpoint', async () => {
    const owner = await createTestUser(app);
    const attacker = await createTestUser(app);

    const created = await owner.agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    // Read
    await attacker.agent.get(`/api/goals/${goalId}`).expect(404);
    // Update
    await attacker.agent.patch(`/api/goals/${goalId}`).send({ name: 'Hijacked' }).expect(404);
    // Contribute
    await attacker.agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(10_000) })
      .expect(404);
    // Delete
    await attacker.agent.delete(`/api/goals/${goalId}`).expect(404);

    // The owner's goal is untouched by any of it.
    const stillThere = await owner.agent.get(`/api/goals/${goalId}`).expect(200);
    expect(stillThere.body.data.goal.currentAmount).toBe(0);
  });

  it('hides another user’s transactions', async () => {
    const owner = await createTestUser(app);
    const attacker = await createTestUser(app);

    const created = await owner.agent
      .post('/api/transactions')
      .send(transactionPayload())
      .expect(201);
    const id = created.body.data.transaction.id as string;

    await attacker.agent.get(`/api/transactions/${id}`).expect(404);
    await attacker.agent.patch(`/api/transactions/${id}`).send({ amount: 1 }).expect(404);
    await attacker.agent.delete(`/api/transactions/${id}`).expect(404);
  });

  it('hides another user’s budget', async () => {
    const owner = await createTestUser(app);
    const attacker = await createTestUser(app);

    const created = await owner.agent.post('/api/budgets').send(budgetPayload()).expect(201);
    const id = created.body.data.budget.id as string;

    await attacker.agent.get(`/api/budgets/${id}`).expect(404);
    await attacker.agent.patch(`/api/budgets/${id}`).send({ plannedIncome: 1 }).expect(404);
    await attacker.agent.delete(`/api/budgets/${id}`).expect(404);
  });

  it('scopes list endpoints to the authenticated user', async () => {
    const first = await createTestUser(app);
    const second = await createTestUser(app);

    await first.agent
      .post('/api/goals')
      .send(goalPayload({ name: 'First user goal' }))
      .expect(201);
    await first.agent.post('/api/transactions').send(transactionPayload()).expect(201);

    const goals = await second.agent.get('/api/goals').expect(200);
    const transactions = await second.agent.get('/api/transactions').expect(200);

    expect(goals.body.data.goals).toHaveLength(0);
    expect(transactions.body.data.items).toHaveLength(0);
    expect(transactions.body.data.total).toBe(0);
  });

  it('refuses to attach a plan to a goal owned by someone else', async () => {
    const owner = await createTestUser(app);
    const attacker = await createTestUser(app);

    const created = await owner.agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    await attacker.agent
      .post('/api/plans')
      .send({
        name: 'Borrowed goal',
        goalId,
        targetAmount: toMinor(500_000),
        contributionAmount: toMinor(50_000),
        frequency: 'monthly',
      })
      .expect(404);
  });

  it('ignores a client-supplied userId', async () => {
    const owner = await createTestUser(app);
    const attacker = await createTestUser(app);

    // Attempting to write a transaction into someone else's account. The field
    // is stripped by the strict schema, so the row lands on the attacker.
    await attacker.agent
      .post('/api/transactions')
      .send({ ...transactionPayload(), userId: owner.userId })
      .expect(400);

    const ownerTransactions = await owner.agent.get('/api/transactions').expect(200);
    expect(ownerTransactions.body.data.items).toHaveLength(0);
  });
});

describe('unauthenticated access', () => {
  const protectedRoutes: [string, string][] = [
    ['get', '/api/goals'],
    ['post', '/api/goals'],
    ['get', '/api/transactions'],
    ['post', '/api/transactions'],
    ['get', '/api/budgets'],
    ['get', '/api/budgets/current'],
    ['get', '/api/plans'],
    ['get', '/api/analytics/overview'],
    ['get', '/api/analytics/spending'],
    ['get', '/api/analytics/savings'],
    ['get', '/api/analytics/categories'],
    ['get', '/api/insights'],
    ['get', '/api/notifications'],
    ['get', '/api/users/me'],
    ['patch', '/api/users/me'],
  ];

  it.each(protectedRoutes)('rejects %s %s without a session', async (method, route) => {
    const response = await (
      request(app) as unknown as Record<string, (url: string) => request.Test>
    )[method]?.(route);

    expect(response?.status).toBe(401);
    expect(response?.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('input validation', () => {
  it('rejects a malformed ObjectId as not found rather than crashing', async () => {
    const { agent } = await createTestUser(app);
    const response = await agent.get('/api/goals/not-an-object-id').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a MongoDB operator smuggled into a login payload', async () => {
    // The classic NoSQL injection: `{ email: { $gt: '' } }` would match any
    // user if it reached the query. Zod rejects a non-string first.
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } })
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-integer money amount', async () => {
    const { agent } = await createTestUser(app);

    const response = await agent
      .post('/api/goals')
      .send(goalPayload({ targetAmount: 1000.5 }))
      .expect(400);

    expect(response.body.error.details.targetAmount).toBeDefined();
  });

  it('rejects a negative amount', async () => {
    const { agent } = await createTestUser(app);
    await agent
      .post('/api/transactions')
      .send(transactionPayload({ amount: -500 }))
      .expect(400);
  });

  it('rejects a category that does not apply to the transaction type', async () => {
    const { agent } = await createTestUser(app);

    const response = await agent
      .post('/api/transactions')
      .send(transactionPayload({ type: 'income', category: 'food' }))
      .expect(400);

    expect(response.body.error.details.category).toBeDefined();
  });

  it('rejects an oversized payload', async () => {
    const { agent } = await createTestUser(app);

    await agent
      .post('/api/transactions')
      .send(transactionPayload({ description: 'x'.repeat(200_000) }))
      .expect(413);
  });
});

describe('error responses', () => {
  it('does not reveal which API routes exist to an anonymous caller', async () => {
    // `authenticate` is mounted on the router, so it runs before route
    // matching: an unknown path and a real one are indistinguishable without a
    // session. That is deliberate — a 404 here would map the API for free.
    const response = await request(app).get('/api/nope').expect(401);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: expect.any(String) },
    });
  });

  it('returns a consistent 404 envelope for a signed-in user', async () => {
    const { agent } = await createTestUser(app);
    const response = await agent.get('/api/nope').expect(404);

    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });

  it('does not leak a stack trace for a client error', async () => {
    const response = await request(app).post('/api/auth/login').send({}).expect(400);
    expect(JSON.stringify(response.body)).not.toContain('at ');
  });
});
