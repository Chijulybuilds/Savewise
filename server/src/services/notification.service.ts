import type { NotificationListDto, NotificationType } from '@savewise/shared';

import { logger } from '../config/logger.js';
import { Notification } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';
import { toNotificationDto } from './mappers.js';

/**
 * In-app notifications.
 *
 * Writes are best-effort: a notification is a side effect of something that
 * already succeeded, so failing to record one must never roll back the
 * contribution or budget update that triggered it. Failures are logged and
 * swallowed by design.
 */

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  /** Collapses repeats — e.g. one "food budget exceeded" per month, not one per transaction. */
  dedupeKey?: string | null;
}

export async function notify(input: CreateNotificationInput): Promise<void> {
  try {
    await Notification.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      dedupeKey: input.dedupeKey ?? null,
    });
  } catch (error) {
    // 11000 is the dedupe index doing its job, not a fault.
    if (typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000)
      return;
    logger.warn({ err: error, userId: input.userId }, 'Could not record notification');
  }
}

export async function listNotifications(userId: string, limit = 20): Promise<NotificationListDto> {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit).exec(),
    Notification.countDocuments({ userId, read: false }).exec(),
  ]);

  return { items: items.map(toNotificationDto), unreadCount };
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  // The `userId` filter is the ownership check: a notification belonging to
  // someone else simply does not match, so there is nothing to update.
  const result = await Notification.updateOne(
    { _id: notificationId, userId },
    { $set: { read: true } },
  ).exec();

  if (result.matchedCount === 0) throw AppError.notFound('Notification');
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    { userId, read: false },
    { $set: { read: true } },
  ).exec();
  return result.modifiedCount;
}
