import type {
  CategoryAnalyticsDto,
  InsightDto,
  MonthKey,
  NotificationListDto,
  OverviewDto,
  SavingsAnalyticsDto,
  SpendingAnalyticsDto,
} from '@savewise/shared';

import { get, post } from './api';

export const analyticsService = {
  /** The dashboard payload — one request rather than six. */
  overview(month?: MonthKey): Promise<OverviewDto> {
    return get<OverviewDto>('/analytics/overview', { params: month ? { month } : undefined });
  },

  spending(months = 12): Promise<SpendingAnalyticsDto> {
    return get<SpendingAnalyticsDto>('/analytics/spending', { params: { months } });
  },

  savings(months = 12): Promise<SavingsAnalyticsDto> {
    return get<SavingsAnalyticsDto>('/analytics/savings', { params: { months } });
  },

  categories(month?: MonthKey): Promise<CategoryAnalyticsDto> {
    return get<CategoryAnalyticsDto>('/analytics/categories', {
      params: month ? { month } : undefined,
    });
  },
};

export const insightService = {
  list(month?: MonthKey): Promise<InsightDto[]> {
    return get<{ insights: InsightDto[] }>('/insights', {
      params: month ? { month } : undefined,
    }).then((d) => d.insights);
  },
};

export const notificationService = {
  list(): Promise<NotificationListDto> {
    return get<NotificationListDto>('/notifications');
  },

  markRead(id: string): Promise<void> {
    return post<{ message: string }>(`/notifications/${id}/read`).then(() => undefined);
  },

  markAllRead(): Promise<number> {
    return post<{ updated: number }>('/notifications/read-all').then((d) => d.updated);
  },
};
