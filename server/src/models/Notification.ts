import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import { NOTIFICATION_TYPES, type NotificationType } from '@savewise/shared';

/**
 * In-app notifications.
 *
 * Deliberately in-app only: no email, no SMS. They record things that already
 * happened in the user's own account (a milestone reached, a budget exceeded),
 * so they can be written synchronously alongside the event that caused them
 * without a queue.
 *
 * A TTL index expires them after 90 days — nobody scrolls back further, and an
 * unbounded notification collection is a slow leak.
 */

export interface NotificationAttributes {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  /** Collapses duplicates: one "budget exceeded" per category per month. */
  dedupeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<NotificationAttributes>;

const notificationSchema = new Schema<NotificationAttributes>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 400 },
    href: { type: String, default: null, maxlength: 200 },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

// Partial + unique: only documents that actually carry a dedupe key take part,
// so ordinary notifications are unaffected.
notificationSchema.index(
  { userId: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export const Notification = defineModel<NotificationAttributes, Model<NotificationAttributes>>(
  'Notification',
  notificationSchema,
);
