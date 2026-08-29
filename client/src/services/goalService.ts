import type {
  ContributeInput,
  ContributionResultDto,
  CreateGoalInput,
  GoalDto,
  GoalListDto,
  GoalQuery,
  UpdateGoalInput,
} from '@savewise/shared';

import { del, get, patch, post } from './api';

export const goalService = {
  list(query: Partial<GoalQuery> = {}): Promise<GoalListDto> {
    return get<GoalListDto>('/goals', { params: query });
  },

  getOne(id: string): Promise<GoalDto> {
    return get<{ goal: GoalDto }>(`/goals/${id}`).then((data) => data.goal);
  },

  create(input: CreateGoalInput): Promise<GoalDto> {
    return post<{ goal: GoalDto }>('/goals', input).then((data) => data.goal);
  },

  update(id: string, input: UpdateGoalInput): Promise<GoalDto> {
    return patch<{ goal: GoalDto }>(`/goals/${id}`, input).then((data) => data.goal);
  },

  remove(id: string): Promise<void> {
    return del(`/goals/${id}`);
  },

  /**
   * Records a contribution. This is a *ledger* operation — Savewise never moves
   * money — so the response carries both the updated goal and the transaction
   * that was written alongside it.
   */
  contribute(id: string, input: ContributeInput): Promise<ContributionResultDto> {
    return post<ContributionResultDto>(`/goals/${id}/contribute`, input);
  },
};
