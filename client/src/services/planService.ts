import type {
  CreatePlanInput,
  PlanDto,
  PlanQuery,
  RecordPlanContributionInput,
  UpdatePlanInput,
} from '@savewise/shared';

import { del, get, patch, post } from './api';

export const planService = {
  list(query: Partial<PlanQuery> = {}): Promise<PlanDto[]> {
    return get<{ plans: PlanDto[] }>('/plans', { params: query }).then((d) => d.plans);
  },

  getOne(id: string): Promise<PlanDto> {
    return get<{ plan: PlanDto }>(`/plans/${id}`).then((d) => d.plan);
  },

  create(input: CreatePlanInput): Promise<PlanDto> {
    return post<{ plan: PlanDto }>('/plans', input).then((d) => d.plan);
  },

  update(id: string, input: UpdatePlanInput): Promise<PlanDto> {
    return patch<{ plan: PlanDto }>(`/plans/${id}`, input).then((d) => d.plan);
  },

  remove(id: string): Promise<void> {
    return del(`/plans/${id}`);
  },

  /** Marks a scheduled contribution as actually made. */
  contribute(id: string, input: RecordPlanContributionInput = {}): Promise<PlanDto> {
    return post<{ plan: PlanDto }>(`/plans/${id}/contribute`, input).then((d) => d.plan);
  },
};
