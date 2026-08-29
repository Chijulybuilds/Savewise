import type {
  CreateTransactionInput,
  TransactionDto,
  TransactionListDto,
  TransactionQuery,
  UpdateTransactionInput,
} from '@savewise/shared';

import { del, get, patch, post } from './api';

export const transactionService = {
  list(query: Partial<TransactionQuery> = {}): Promise<TransactionListDto> {
    // Undefined filters are stripped so the URL stays readable and the query
    // key stays stable — `?type=undefined` would otherwise reach the API.
    const params = Object.fromEntries(
      Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    );
    return get<TransactionListDto>('/transactions', { params });
  },

  getOne(id: string): Promise<TransactionDto> {
    return get<{ transaction: TransactionDto }>(`/transactions/${id}`).then(
      (data) => data.transaction,
    );
  },

  create(input: CreateTransactionInput): Promise<TransactionDto> {
    return post<{ transaction: TransactionDto }>('/transactions', input).then((d) => d.transaction);
  },

  update(id: string, input: UpdateTransactionInput): Promise<TransactionDto> {
    return patch<{ transaction: TransactionDto }>(`/transactions/${id}`, input).then(
      (d) => d.transaction,
    );
  },

  remove(id: string): Promise<void> {
    return del(`/transactions/${id}`);
  },
};
