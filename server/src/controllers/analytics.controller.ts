import type { Request, Response } from 'express';

import { toMonthKey, type MonthKey } from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import * as analyticsService from '../services/analytics.service.js';
import { generateInsights } from '../services/insight.service.js';
import * as notificationService from '../services/notification.service.js';
import { sendSuccess } from '../utils/http.js';

/** `?month=` is validated upstream, so an unset value falls back to today. */
function monthOf(req: Request): MonthKey {
  const month = (req.query as { month?: string }).month;
  return month ?? toMonthKey();
}

export async function overview(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, await analyticsService.getOverview(userId, monthOf(req)));
}

export async function spending(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const months = Number((req.query as { months?: string }).months ?? 12);
  sendSuccess(res, await analyticsService.getSpendingAnalytics(userId, months));
}

export async function savings(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const months = Number((req.query as { months?: string }).months ?? 12);
  sendSuccess(res, await analyticsService.getSavingsAnalytics(userId, months));
}

export async function categories(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, await analyticsService.getCategoryAnalytics(userId, monthOf(req)));
}

export async function insights(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, { insights: await generateInsights(userId, monthOf(req)) });
}

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, await notificationService.listNotifications(userId));
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await notificationService.markRead(userId, req.params.id as string);
  sendSuccess(res, { message: 'Marked as read' });
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const updated = await notificationService.markAllRead(userId);
  sendSuccess(res, { updated });
}
