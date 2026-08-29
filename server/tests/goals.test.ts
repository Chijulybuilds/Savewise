import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { toMinor } from '@savewise/shared';

import { SavingsGoal } from '../src/models/SavingsGoal.js';
import { Transaction } from '../src/models/Transaction.js';
import {
  clearDatabase,
  createTestUser,
  goalPayload,
  sessionCookies,
  startTestDatabase,
  stopTestDatabase,
  testApp,
  type TestUser,
} from './helpers.js';

/**
 * Goals and contributions.
 *
 * The invariant under test is the one the whole design turns on: a goal's
 * balance and the transaction ledger can never disagree. Every contribution
 * writes both, and a rollback must undo both.
 */

let app: Express;

beforeAll(async () => {
  await startTestDatabase();
  app = testApp();
});

afterAll(stopTestDatabase);

afterEach(clearDatabase);

/** A fresh account per test, so no test can see another's data. */
async function signedIn(): Promise<TestUser> {
  return createTestUser(app);
}

describe('POST /api/goals', () => {
  it('creates a goal and derives its progress', async () => {
    const { agent } = await signedIn();

    const response = await agent
      .post('/api/goals')
      .send(goalPayload({ name: 'Emergency Fund', targetAmount: toMinor(1_200_000) }))
      .expect(201);

    const goal = response.body.data.goal;
    expect(goal.name).toBe('Emergency Fund');
    expect(goal.currentAmount).toBe(0);
    expect(goal.status).toBe('active');
    // Derived server-side so every surface agrees on the numbers.
    expect(goal.progress.remainingAmount).toBe(toMinor(1_200_000));
    expect(goal.progress.percentComplete).toBe(0);
  });

  it('accepts an opening balance without writing it to the ledger', async () => {
    const { agent } = await signedIn();

    const response = await agent
      .post('/api/goals')
      .send(goalPayload({ startingAmount: toMinor(300_000) }))
      .expect(201);

    expect(response.body.data.goal.currentAmount).toBe(toMinor(300_000));
    // Money already set aside is not new savings activity, so no transaction.
    expect(await Transaction.countDocuments({})).toBe(0);
  });

  it('rejects an opening balance larger than the target', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/goals')
      .send(goalPayload({ targetAmount: toMinor(100_000), startingAmount: toMinor(200_000) }))
      .expect(400);
  });

  it('rejects a deadline in the past', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/goals')
      .send(goalPayload({ deadline: '2020-01-01T00:00:00.000Z' }))
      .expect(400);
  });

  it('refuses a duplicate goal name for the same user', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/goals')
      .send(goalPayload({ name: 'Rent' }))
      .expect(201);
    await agent
      .post('/api/goals')
      .send(goalPayload({ name: 'Rent' }))
      .expect(409);
  });

  it('ignores a client attempt to set currentAmount directly', async () => {
    const { agent } = await signedIn();

    // `currentAmount` is not in the schema, and the schema is `.strict()`.
    await agent
      .post('/api/goals')
      .send({ ...goalPayload(), currentAmount: toMinor(999_999) })
      .expect(400);
  });
});

describe('POST /api/goals/:id/contribute', () => {
  async function createGoal(agent: TestUser['agent'], overrides = {}) {
    const response = await agent.post('/api/goals').send(goalPayload(overrides)).expect(201);
    return response.body.data.goal.id as string;
  }

  it('moves the balance and writes a matching ledger entry', async () => {
    const { agent } = await signedIn();
    const goalId = await createGoal(agent);

    const response = await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(55_000) })
      .expect(201);

    expect(response.body.data.goal.currentAmount).toBe(toMinor(55_000));
    expect(response.body.data.transaction.type).toBe('saving');
    expect(response.body.data.transaction.amount).toBe(toMinor(55_000));

    // The two records agree, which is the whole point.
    const goal = await SavingsGoal.findById(goalId);
    const ledger = await Transaction.find({ goalId });
    expect(goal?.currentAmount).toBe(toMinor(55_000));
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.amount).toBe(toMinor(55_000));
  });

  it('accumulates across contributions without drift', async () => {
    const { agent } = await signedIn();
    const goalId = await createGoal(agent);

    for (const amount of [12_345, 67_890, 1, 99_999]) {
      await agent.post(`/api/goals/${goalId}/contribute`).send({ amount }).expect(201);
    }

    const goal = await SavingsGoal.findById(goalId);
    expect(goal?.currentAmount).toBe(12_345 + 67_890 + 1 + 99_999);
  });

  it('survives concurrent contributions without losing one', async () => {
    const user = await signedIn();
    const goalId = await createGoal(user.agent);

    // Each request goes over its own connection rather than sharing the
    // agent's single socket — supertest's agent serialises requests, which
    // would defeat the point of a concurrency test.
    const cookies = await sessionCookies(app, user);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/goals/${goalId}/contribute`)
          .set('Cookie', cookies)
          .send({ amount: toMinor(1_000) }),
      ),
    );

    expect(responses.every((response) => response.status === 201)).toBe(true);

    // A read-modify-write would lose several of these to lost updates; the
    // atomic `$inc` in `contribute` cannot.
    const goal = await SavingsGoal.findById(goalId);
    expect(goal?.currentAmount).toBe(toMinor(10_000));
    expect(await Transaction.countDocuments({ goalId })).toBe(10);
  });

  it('reports the milestone that was crossed', async () => {
    const { agent } = await signedIn();
    const goalId = await createGoal(agent, { targetAmount: toMinor(100_000) });

    const first = await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(30_000) })
      .expect(201);
    expect(first.body.data.milestoneReached).toBe(25);

    const second = await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(70_000) })
      .expect(201);
    expect(second.body.data.milestoneReached).toBe(100);
    expect(second.body.data.goal.status).toBe('completed');
  });

  it('refuses a contribution to a completed goal', async () => {
    const { agent } = await signedIn();
    const goalId = await createGoal(agent, { targetAmount: toMinor(50_000) });

    await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(50_000) })
      .expect(201);

    await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(10_000) })
      .expect(422);
  });

  it('rejects a zero or negative contribution', async () => {
    const { agent } = await signedIn();
    const goalId = await createGoal(agent);

    await agent.post(`/api/goals/${goalId}/contribute`).send({ amount: 0 }).expect(400);
    await agent.post(`/api/goals/${goalId}/contribute`).send({ amount: -5000 }).expect(400);
  });
});

describe('deleting a contribution', () => {
  it('reverses the goal balance when the ledger entry is removed', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    const contribution = await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(40_000) })
      .expect(201);

    await agent.delete(`/api/transactions/${contribution.body.data.transaction.id}`).expect(204);

    // Deleting the entry alone would leave the goal overstated.
    const goal = await SavingsGoal.findById(goalId);
    expect(goal?.currentAmount).toBe(0);
  });

  it('refuses to edit a contribution in isolation', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    const contribution = await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(40_000) })
      .expect(201);

    // Editing the amount here would desynchronise it from the goal balance.
    const response = await agent
      .patch(`/api/transactions/${contribution.body.data.transaction.id}`)
      .send({ amount: toMinor(90_000) })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

describe('DELETE /api/goals/:id', () => {
  it('keeps the contribution history and detaches it', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(25_000) })
      .expect(201);

    await agent.delete(`/api/goals/${goalId}`).expect(204);

    // Those savings really happened — deleting them would rewrite past months.
    const remaining = await Transaction.find({});
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.goalId).toBeNull();
    expect(await SavingsGoal.countDocuments({})).toBe(0);
  });
});

describe('PATCH /api/goals/:id', () => {
  it('refuses a target below what is already saved', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    await agent
      .post(`/api/goals/${goalId}/contribute`)
      .send({ amount: toMinor(500_000) })
      .expect(201);

    await agent
      .patch(`/api/goals/${goalId}`)
      .send({ targetAmount: toMinor(100_000) })
      .expect(422);
  });

  it('pauses and resumes a goal', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);
    const goalId = created.body.data.goal.id as string;

    const paused = await agent.patch(`/api/goals/${goalId}`).send({ status: 'paused' }).expect(200);
    expect(paused.body.data.goal.status).toBe('paused');

    const resumed = await agent
      .patch(`/api/goals/${goalId}`)
      .send({ status: 'active' })
      .expect(200);
    expect(resumed.body.data.goal.status).toBe('active');
  });

  it('rejects an attempt to declare a goal complete', async () => {
    const { agent } = await signedIn();
    const created = await agent.post('/api/goals').send(goalPayload()).expect(201);

    // Completion is reached by funding the goal, never by asserting it.
    await agent
      .patch(`/api/goals/${created.body.data.goal.id}`)
      .send({ status: 'completed' })
      .expect(400);
  });
});

describe('GET /api/goals', () => {
  it('summarises every goal in the overview', async () => {
    const { agent } = await signedIn();

    await agent
      .post('/api/goals')
      .send(
        goalPayload({
          name: 'One',
          targetAmount: toMinor(100_000),
          monthlyContribution: toMinor(10_000),
        }),
      )
      .expect(201);
    await agent
      .post('/api/goals')
      .send(
        goalPayload({
          name: 'Two',
          targetAmount: toMinor(300_000),
          monthlyContribution: toMinor(20_000),
        }),
      )
      .expect(201);

    const response = await agent.get('/api/goals').expect(200);
    const { overview } = response.body.data;

    expect(overview.totalTarget).toBe(toMinor(400_000));
    expect(overview.activeCount).toBe(2);
    expect(overview.committedMonthly).toBe(toMinor(30_000));
  });

  it('filters by status', async () => {
    const { agent } = await signedIn();

    const created = await agent
      .post('/api/goals')
      .send(goalPayload({ name: 'Paused one' }))
      .expect(201);
    await agent
      .post('/api/goals')
      .send(goalPayload({ name: 'Active one' }))
      .expect(201);
    await agent
      .patch(`/api/goals/${created.body.data.goal.id}`)
      .send({ status: 'paused' })
      .expect(200);

    const response = await agent.get('/api/goals?status=paused').expect(200);
    expect(response.body.data.goals).toHaveLength(1);
    expect(response.body.data.goals[0].name).toBe('Paused one');
  });
});
