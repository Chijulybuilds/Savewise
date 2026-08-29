import type { Request, Response } from 'express';

import type {
  CreatePlanInput,
  PlanQuery,
  RecordPlanContributionInput,
  UpdatePlanInput,
} from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as planService from '../services/plan.service.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http.js';

export async function list(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, {
    plans: await planService.listPlans(userId, req.query as unknown as PlanQuery),
  });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { plan: await planService.getPlan(userId, req.params.id as string) });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendCreated(res, { plan: await planService.createPlan(userId, req.body as CreatePlanInput) });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const plan = await planService.updatePlan(
    userId,
    req.params.id as string,
    req.body as UpdatePlanInput,
  );
  sendSuccess(res, { plan });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await planService.deletePlan(userId, req.params.id as string);
  sendNoContent(res);
}

export async function contribute(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const plan = await planService.recordContribution(
    userId,
    req.params.id as string,
    req.body as RecordPlanContributionInput,
  );
  sendCreated(res, { plan });
}
