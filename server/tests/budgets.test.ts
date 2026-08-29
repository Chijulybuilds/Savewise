import type { Express } from 'express';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { toMinor, toMonthKey } from '@savewise/shared';

import {
  budgetPayload,
  clearDatabase,
  createTestUser,
  startTestDatabase,
  stopTestDatabase,
  testApp,
  transactionPayload,
  type TestUser,
} from './helpers.js';

/**
 * Budgets.
 *
 * The design decision under test: `spent` is never stored. It is aggregated
 * from the transaction ledger on every read, so a back-dated, edited or deleted
 * transaction is reflected immediately and a budget can never drift out of sync
 * with what actually happened.
 */

let app: Express;
const MONTH = toMonthKey();

beforeAll(async () => {
  await startTestDatabase();
  app = testApp();
});

afterAll(stopTestDatabase);
afterEach(clearDatabase);

async function signedIn(): Promise<TestUser> {
  return createTestUser(app);
}

describe('POST /api/budgets', () => {
  it('creates a budget for a month', async () => {
    const { agent } = await signedIn();

    const response = await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    const budget = response.body.data.budget;
    expect(budget.month).toBe(MONTH);
    expect(budget.totals.budgeted).toBe(toMinor(145_000));
    expect(budget.totals.spent).toBe(0);
    expect(budget.totals.health).toBe('healthy');
  });

  it('refuses a second budget for the same month', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);
    const response = await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(409);

    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('refuses planned savings larger than planned income', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/budgets')
      .send(
        budgetPayload({
          plannedIncome: toMinor(100_000),
          plannedSavings: toMinor(200_000),
        }),
      )
      .expect(400);
  });

  it('refuses a duplicated category line', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/budgets')
      .send(
        budgetPayload({
          categories: [
            { category: 'food', budgeted: toMinor(50_000) },
            { category: 'food', budgeted: toMinor(30_000) },
          ],
        }),
      )
      .expect(400);
  });

  it('rejects a malformed month key', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: 'August' }))
      .expect(400);
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: '2026-13' }))
      .expect(400);
  });
});

describe('spend aggregation', () => {
  it('reflects transactions without storing a counter', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    await agent
      .post('/api/transactions')
      .send(transactionPayload({ category: 'food', amount: toMinor(30_000) }))
      .expect(201);
    await agent
      .post('/api/transactions')
      .send(transactionPayload({ category: 'food', amount: toMinor(20_000) }))
      .expect(201);

    const response = await agent.get('/api/budgets/current').expect(200);
    const food = response.body.data.budget.categories.find(
      (line: { category: string }) => line.category === 'food',
    );

    expect(food.spent).toBe(toMinor(50_000));
    expect(food.remaining).toBe(toMinor(40_000));
    expect(food.percentageUsed).toBeCloseTo(55.56, 1);
    expect(food.health).toBe('healthy');
  });

  it('recalculates immediately when a transaction is deleted', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    const created = await agent
      .post('/api/transactions')
      .send(transactionPayload({ category: 'food', amount: toMinor(50_000) }))
      .expect(201);

    await agent.delete(`/api/transactions/${created.body.data.transaction.id}`).expect(204);

    const response = await agent.get('/api/budgets/current').expect(200);
    const food = response.body.data.budget.categories.find(
      (line: { category: string }) => line.category === 'food',
    );

    // A stored `spent` counter would still read ₦50,000 here.
    expect(food.spent).toBe(0);
  });

  it('flags an exceeded category and reports the overspend', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    await agent
      .post('/api/transactions')
      .send(transactionPayload({ category: 'food', amount: toMinor(120_000) }))
      .expect(201);

    const response = await agent.get('/api/budgets/current').expect(200);
    const food = response.body.data.budget.categories.find(
      (line: { category: string }) => line.category === 'food',
    );

    expect(food.health).toBe('exceeded');
    expect(food.overspend).toBe(toMinor(30_000));
    // Remaining is floored at zero rather than going negative.
    expect(food.remaining).toBe(0);
  });

  it('includes spending in categories that were never budgeted', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    await agent
      .post('/api/transactions')
      .send(transactionPayload({ category: 'entertainment', amount: toMinor(15_000) }))
      .expect(201);

    const response = await agent.get('/api/budgets/current').expect(200);
    const entertainment = response.body.data.budget.categories.find(
      (line: { category: string }) => line.category === 'entertainment',
    );

    // Money spent outside a budget still counts against the month.
    expect(entertainment).toBeDefined();
    expect(entertainment.budgeted).toBe(0);
    expect(entertainment.spent).toBe(toMinor(15_000));
    expect(entertainment.health).toBe('exceeded');
  });

  it('does not count savings contributions as spending', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    await agent
      .post('/api/transactions')
      .send(transactionPayload({ type: 'saving', category: 'savings', amount: toMinor(100_000) }))
      .expect(201);

    const response = await agent.get('/api/budgets/current').expect(200);
    expect(response.body.data.budget.totals.spent).toBe(0);
    expect(response.body.data.budget.totals.actualSavings).toBe(toMinor(100_000));
  });
});

describe('GET /api/budgets', () => {
  it('returns null for a month with no budget rather than a 404', async () => {
    const { agent } = await signedIn();

    // "You have not budgeted yet" is an empty state the UI renders, not an error.
    const response = await agent.get('/api/budgets?month=2026-01').expect(200);
    expect(response.body.data.budget).toBeNull();
  });

  it('resolves /current without a month parameter', async () => {
    const { agent } = await signedIn();
    await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    const response = await agent.get('/api/budgets/current').expect(200);
    expect(response.body.data.budget.month).toBe(MONTH);
  });
});

describe('PATCH /api/budgets/:id', () => {
  it('replaces the category lines', async () => {
    const { agent } = await signedIn();
    const created = await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    const response = await agent
      .patch(`/api/budgets/${created.body.data.budget.id}`)
      .send({ categories: [{ category: 'housing', budgeted: toMinor(200_000) }] })
      .expect(200);

    expect(response.body.data.budget.categories).toHaveLength(1);
    expect(response.body.data.budget.totals.budgeted).toBe(toMinor(200_000));
  });

  it('refuses an update that would put savings above income', async () => {
    const { agent } = await signedIn();
    const created = await agent
      .post('/api/budgets')
      .send(budgetPayload({ month: MONTH }))
      .expect(201);

    await agent
      .patch(`/api/budgets/${created.body.data.budget.id}`)
      .send({ plannedSavings: toMinor(900_000) })
      .expect(422);
  });
});
