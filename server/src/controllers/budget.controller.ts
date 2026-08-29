import type { Request, Response } from 'express';

import {
  toMonthKey,
  type BudgetQuery,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as budgetService from '../services/budget.service.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http.js';

export async function list(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const query = req.query as unknown as BudgetQuery;

  // `?month=` narrows to a single budget and returns `null` rather than 404
  // when none exists — "no budget yet" is an empty state, not an error.
  if (query.month) {
    sendSuccess(res, { budget: await budgetService.getBudgetForMonth(userId, query.month) });
    return;
  }

  sendSuccess(res, { budgets: await budgetService.listBudgets(userId, query) });
}

export async function current(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { budget: await budgetService.getBudgetForMonth(userId, toMonthKey()) });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { budget: await budgetService.getBudget(userId, req.params.id as string) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendCreated(res, {
    budget: await budgetService.createBudget(userId, req.body as CreateBudgetInput),
  });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const budget = await budgetService.updateBudget(
    userId,
    req.params.id as string,
    req.body as UpdateBudgetInput,
  );
  sendSuccess(res, { budget });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await budgetService.deleteBudget(userId, req.params.id as string);
  sendNoContent(res);
}
