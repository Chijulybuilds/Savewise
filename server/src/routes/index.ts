import { Router } from 'express';
import { z } from 'zod';

import {
  budgetQuerySchema,
  contributeSchema,
  createBudgetSchema,
  createGoalSchema,
  createPlanSchema,
  createTransactionSchema,
  goalQuerySchema,
  monthKeySchema,
  objectIdSchema,
  onboardingSchema,
  planQuerySchema,
  recordPlanContributionSchema,
  transactionQuerySchema,
  updateBudgetSchema,
  updateGoalSchema,
  updatePlanSchema,
  updatePreferencesSchema,
  updateProfileSchema,
  updateTransactionSchema,
} from '@savewise/shared';

import * as analytics from '../controllers/analytics.controller.js';
import * as budgets from '../controllers/budget.controller.js';
import * as goals from '../controllers/goal.controller.js';
import * as plans from '../controllers/plan.controller.js';
import * as transactions from '../controllers/transaction.controller.js';
import * as users from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { writeRateLimit } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';
import authRoutes from './auth.routes.js';

/**
 * API surface.
 *
 * Every route below `/api/auth` is mounted behind `authenticate`, applied once
 * at the router rather than per-handler. A new endpoint is protected by
 * default — the failure mode of forgetting a middleware is a broken route, not
 * an open one.
 */
const router: Router = Router();

router.use('/auth', authRoutes);

// ---- Everything past this line requires a valid session ---------------------
router.use(authenticate);

/** Path parameters are validated as ObjectIds before any query is built. */
const idParams = validateParams(z.object({ id: objectIdSchema }));
const monthQuery = validateQuery(z.object({ month: monthKeySchema.optional() }));

/* -------------------------------- Profile -------------------------------- */

router.get('/users/me', asyncHandler(users.getProfile));
router.patch(
  '/users/me',
  writeRateLimit,
  validateBody(updateProfileSchema),
  asyncHandler(users.updateProfile),
);
router.patch(
  '/users/me/preferences',
  writeRateLimit,
  validateBody(updatePreferencesSchema),
  asyncHandler(users.updatePreferences),
);
router.post(
  '/users/me/onboarding',
  writeRateLimit,
  validateBody(onboardingSchema),
  asyncHandler(users.completeOnboarding),
);

/* --------------------------------- Goals --------------------------------- */

router.get('/goals', validateQuery(goalQuerySchema), asyncHandler(goals.list));
router.post('/goals', writeRateLimit, validateBody(createGoalSchema), asyncHandler(goals.create));
router.get('/goals/:id', idParams, asyncHandler(goals.getOne));
router.patch(
  '/goals/:id',
  writeRateLimit,
  idParams,
  validateBody(updateGoalSchema),
  asyncHandler(goals.update),
);
router.delete('/goals/:id', writeRateLimit, idParams, asyncHandler(goals.remove));
router.post(
  '/goals/:id/contribute',
  writeRateLimit,
  idParams,
  validateBody(contributeSchema),
  asyncHandler(goals.contribute),
);

/* ----------------------------- Transactions ------------------------------ */

router.get('/transactions', validateQuery(transactionQuerySchema), asyncHandler(transactions.list));
router.post(
  '/transactions',
  writeRateLimit,
  validateBody(createTransactionSchema),
  asyncHandler(transactions.create),
);
router.get('/transactions/:id', idParams, asyncHandler(transactions.getOne));
router.patch(
  '/transactions/:id',
  writeRateLimit,
  idParams,
  validateBody(updateTransactionSchema),
  asyncHandler(transactions.update),
);
router.delete('/transactions/:id', writeRateLimit, idParams, asyncHandler(transactions.remove));

/* -------------------------------- Budgets -------------------------------- */

// Declared before `/:id` so `current` is never parsed as an identifier.
router.get('/budgets/current', asyncHandler(budgets.current));
router.get('/budgets', validateQuery(budgetQuerySchema), asyncHandler(budgets.list));
router.post(
  '/budgets',
  writeRateLimit,
  validateBody(createBudgetSchema),
  asyncHandler(budgets.create),
);
router.get('/budgets/:id', idParams, asyncHandler(budgets.getOne));
router.patch(
  '/budgets/:id',
  writeRateLimit,
  idParams,
  validateBody(updateBudgetSchema),
  asyncHandler(budgets.update),
);
router.delete('/budgets/:id', writeRateLimit, idParams, asyncHandler(budgets.remove));

/* --------------------------------- Plans --------------------------------- */

router.get('/plans', validateQuery(planQuerySchema), asyncHandler(plans.list));
router.post('/plans', writeRateLimit, validateBody(createPlanSchema), asyncHandler(plans.create));
router.get('/plans/:id', idParams, asyncHandler(plans.getOne));
router.patch(
  '/plans/:id',
  writeRateLimit,
  idParams,
  validateBody(updatePlanSchema),
  asyncHandler(plans.update),
);
router.delete('/plans/:id', writeRateLimit, idParams, asyncHandler(plans.remove));
router.post(
  '/plans/:id/contribute',
  writeRateLimit,
  idParams,
  validateBody(recordPlanContributionSchema),
  asyncHandler(plans.contribute),
);

/* ------------------------------- Analytics ------------------------------- */

router.get('/analytics/overview', monthQuery, asyncHandler(analytics.overview));
router.get('/analytics/spending', asyncHandler(analytics.spending));
router.get('/analytics/savings', asyncHandler(analytics.savings));
router.get('/analytics/categories', monthQuery, asyncHandler(analytics.categories));

/* -------------------------------- Insights ------------------------------- */

router.get('/insights', monthQuery, asyncHandler(analytics.insights));

/* ----------------------------- Notifications ----------------------------- */

router.get('/notifications', asyncHandler(analytics.listNotifications));
router.post('/notifications/read-all', asyncHandler(analytics.markAllNotificationsRead));
router.post('/notifications/:id/read', idParams, asyncHandler(analytics.markNotificationRead));

export default router;
