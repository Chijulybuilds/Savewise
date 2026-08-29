import type { Request, Response } from 'express';

import type {
  ContributeInput,
  CreateGoalInput,
  GoalQuery,
  UpdateGoalInput,
} from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as goalService from '../services/goal.service.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http.js';

/**
 * Savings goal endpoints.
 *
 * `requireAuth(req).userId` is the only source of ownership in this file — the
 * `:id` path parameter never grants access on its own, it only narrows a query
 * that is already scoped to the authenticated user.
 */

export async function list(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, await goalService.listGoals(userId, req.query as unknown as GoalQuery));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { goal: await goalService.getGoal(userId, req.params.id as string) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendCreated(res, { goal: await goalService.createGoal(userId, req.body as CreateGoalInput) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const goal = await goalService.updateGoal(
    userId,
    req.params.id as string,
    req.body as UpdateGoalInput,
  );
  sendSuccess(res, { goal });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await goalService.deleteGoal(userId, req.params.id as string);
  sendNoContent(res);
}

export async function contribute(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const result = await goalService.contribute(
    userId,
    req.params.id as string,
    req.body as ContributeInput,
  );
  sendCreated(res, result);
}
