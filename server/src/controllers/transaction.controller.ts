import type { Request, Response } from 'express';

import {
  toMonthKey,
  type CreateTransactionInput,
  type TransactionQuery,
  type UpdateTransactionInput,
} from '@savewise/shared';

import { requireAuth } from '../middleware/authenticate.js';
import { checkBudgetAlerts } from '../services/budget.service.js';
import * as transactionService from '../services/transaction.service.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/http.js';

export async function list(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const query = req.query as unknown as TransactionQuery;
  sendSuccess(res, await transactionService.listTransactions(userId, query));
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  sendSuccess(res, {
    transaction: await transactionService.getTransaction(userId, req.params.id as string),
  });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const input = req.body as CreateTransactionInput;
  const transaction = await transactionService.createTransaction(userId, input);

  // Budget alerts are a side effect of the spend, not part of it. The response
  // does not wait on them and a failure here never fails the write.
  if (input.type === 'expense') {
    void checkBudgetAlerts(userId, toMonthKey(input.date));
  }

  sendCreated(res, { transaction });
}

export async function update(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  const transaction = await transactionService.updateTransaction(
    userId,
    req.params.id as string,
    req.body as UpdateTransactionInput,
  );
  sendSuccess(res, { transaction });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { userId } = requireAuth(req);
  await transactionService.deleteTransaction(userId, req.params.id as string);
  sendNoContent(res);
}
