import { Router } from 'express';

import { changePasswordSchema, loginSchema, registerSchema } from '@savewise/shared';

import * as controller from '../controllers/auth.controller.js';
import { changePassword } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { asyncHandler } from '../utils/http.js';

/**
 * `/api/auth`
 *
 * The credential-accepting routes sit behind the strict auth limiter.
 * `/refresh` is included: it accepts a bearer credential from the client and is
 * just as brute-forceable as `/login` if left open.
 */
const router: Router = Router();

router.post(
  '/register',
  authRateLimit,
  validateBody(registerSchema),
  asyncHandler(controller.register),
);
router.post('/login', authRateLimit, validateBody(loginSchema), asyncHandler(controller.login));
router.post('/refresh', authRateLimit, asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));

router.get('/me', authenticate, asyncHandler(controller.me));

router.post(
  '/change-password',
  authenticate,
  authRateLimit,
  validateBody(changePasswordSchema),
  asyncHandler(changePassword),
);

export default router;
