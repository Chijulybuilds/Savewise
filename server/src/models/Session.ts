import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

/**
 * A refresh-token session.
 *
 * Three properties make this worth a collection of its own rather than a
 * stateless long-lived JWT:
 *
 * 1. **Revocation.** Signing out, or changing a password, invalidates sessions
 *    immediately. A stateless refresh token stays valid until it expires.
 * 2. **Rotation.** Every refresh mints a new token and retires the old one, so
 *    a stolen token has a single-use window.
 * 3. **Reuse detection.** If a *retired* token is presented, the token was
 *    copied — every session in that rotation chain is revoked and the user is
 *    forced to sign in again.
 *
 * Only the SHA-256 digest of the token is stored, so the collection is useless
 * to anyone who exfiltrates it.
 */

export interface SessionAttributes {
  userId: Types.ObjectId;
  tokenHash: string;
  /** Chain identifier — every rotation of one login shares it, enabling family-wide revocation. */
  family: string;
  expiresAt: Date;
  revokedAt: Date | null;
  /** Set when this token was rotated, pointing at its successor. */
  replacedBy: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionDocument = HydratedDocument<SessionAttributes>;

const sessionSchema = new Schema<SessionAttributes>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: String, default: null },
    userAgent: { type: String, default: null, maxlength: 256 },
    // The raw IP is never stored — a hash is enough to notice a session moving
    // between networks without retaining personal data we have no use for.
    ipHash: { type: String, default: null, maxlength: 64 },
  },
  { timestamps: true },
);

// MongoDB's TTL monitor deletes expired sessions on its own, so the collection
// cannot grow without bound and no cleanup cron is needed.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = defineModel<SessionAttributes, Model<SessionAttributes>>(
  'Session',
  sessionSchema,
);
