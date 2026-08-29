import bcrypt from 'bcryptjs';
import { Schema, type HydratedDocument, type Model, type Types } from 'mongoose';

import { defineModel } from './defineModel.js';

import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  FINANCIAL_PRIORITY_KEYS,
  type CurrencyCode,
  type FinancialPriority,
  type Minor,
} from '@savewise/shared';

/**
 * The user account.
 *
 * `passwordHash` carries `select: false`, so it is absent from every query
 * unless a caller explicitly asks for it. Authentication is the only code path
 * that does — everything else is structurally incapable of leaking it, even
 * through a careless `res.json(user)`.
 */

/** Work factor for bcrypt. 12 is ~250ms on modern hardware: slow for an attacker, invisible to a user. */
export const BCRYPT_ROUNDS = 12;

export interface UserPreferences {
  targetMonthlySavings: Minor;
  priorities: FinancialPriority[];
  budgetAlertThreshold: number;
  notifyOnGoalMilestone: boolean;
  notifyOnBudgetExceeded: boolean;
}

export interface UserAttributes {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  currency: CurrencyCode;
  avatarUrl: string | null;
  monthlyIncome: Minor;
  preferences: UserPreferences;
  onboardingCompleted: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserMethods {
  verifyPassword(candidate: string): Promise<boolean>;
  fullName(): string;
}

export type UserDocument = HydratedDocument<UserAttributes, UserMethods>;

interface UserModelType extends Model<UserAttributes, Record<string, never>, UserMethods> {
  hashPassword(password: string): Promise<string>;
  findByEmailWithPassword(email: string): Promise<UserDocument | null>;
}

const preferencesSchema = new Schema<UserPreferences>(
  {
    targetMonthlySavings: { type: Number, default: 0, min: 0 },
    priorities: {
      type: [String],
      enum: FINANCIAL_PRIORITY_KEYS,
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 8,
        message: 'Too many priorities',
      },
    },
    budgetAlertThreshold: { type: Number, default: 80, min: 50, max: 100 },
    notifyOnGoalMilestone: { type: Boolean, default: true },
    notifyOnBudgetExceeded: { type: Boolean, default: true },
  },
  { _id: false },
);

const userSchema = new Schema<UserAttributes, UserModelType, UserMethods>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      // Normalised on write so `Ada@Example.com` and `ada@example.com` cannot
      // become two accounts.
      lowercase: true,
      trim: true,
      maxlength: 254,
      // A unique index is the only reliable duplicate guard; a "does it exist?"
      // check before insert is a race condition waiting to happen.
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    currency: { type: String, enum: CURRENCY_CODES, default: DEFAULT_CURRENCY },
    avatarUrl: { type: String, default: null, maxlength: 2048 },
    monthlyIncome: { type: Number, default: 0, min: 0 },
    preferences: { type: preferencesSchema, default: () => ({}) },
    onboardingCompleted: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    // Belt and braces: even if a document is serialised directly, the hash and
    // the internal version key never appear in the output.
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.method('verifyPassword', function verifyPassword(this: UserDocument, candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
});

userSchema.method('fullName', function fullName(this: UserDocument) {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.static('hashPassword', function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
});

userSchema.static('findByEmailWithPassword', function findByEmailWithPassword(email: string) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash').exec();
});

export const User = defineModel<UserAttributes, UserModelType>('User', userSchema);

export type UserId = Types.ObjectId;
