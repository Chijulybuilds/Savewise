import process from 'node:process';

import {
  addMonths,
  recentMonths,
  toMinor,
  toMonthKey,
  type ExpenseCategoryKey,
  type MonthKey,
} from '@savewise/shared';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env, isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Budget } from '../models/Budget.js';
import { Notification } from '../models/Notification.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { SavingsPlan } from '../models/SavingsPlan.js';
import { Session } from '../models/Session.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';

/**
 * Development seed.
 *
 * Builds a demo account with eight months of plausible Nigerian household
 * finances — a ₦520,000 salary, rent, transport, data, a small side income —
 * so every screen has something honest to render on first load.
 *
 * The numbers are realistic rather than impressive: a dashboard full of
 * ₦50,000,000 balances tells a reviewer nothing about whether the maths works.
 *
 * Randomness is seeded, so two runs produce the same database and a screenshot
 * taken today still matches the app tomorrow.
 */

/** A full year, so the twelve-month trend charts have no empty leading months. */
const MONTHS_OF_HISTORY = 12;

/**
 * Money the demo user already had when they started tracking.
 *
 * Without it the ledger opens at zero and the annual rent payment drags the
 * running balance negative — an artefact of where the history starts, not of
 * the user's habits. Recording it explicitly as an opening balance is both
 * honest and what a real first-time user would do.
 */
const OPENING_BALANCE = 1_500_000;

/** Mulberry32 — a small, fast, deterministic PRNG. */
function createRandom(seed: number) {
  let state = seed;
  return function random(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const random = createRandom(20_260_828);

/** A value that varies by ±`spread` around `base`, rounded to whole naira. */
function vary(baseMajor: number, spread = 0.12): number {
  const factor = 1 + (random() * 2 - 1) * spread;
  return toMinor(Math.round(baseMajor * factor));
}

function dayIn(month: MonthKey, day: number): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year ?? 2026, (monthNumber ?? 1) - 1, day, 9, 0, 0));
}

interface ExpenseTemplate {
  category: ExpenseCategoryKey;
  description: string;
  amount: number;
  day: number;
  /** Chance the expense appears in a given month, for irregular costs. */
  probability?: number;
  spread?: number;
}

/**
 * A recognisable Lagos monthly outgoing profile. Rent is paid annually — as it
 * usually is in Nigeria — rather than smeared across twelve months, which is
 * exactly the kind of lump the budget and insight engines should handle.
 */
const MONTHLY_EXPENSES: ExpenseTemplate[] = [
  { category: 'housing', description: 'Service charge', amount: 25_000, day: 3 },
  { category: 'food', description: 'Market shopping', amount: 62_000, day: 5, spread: 0.18 },
  { category: 'food', description: 'Groceries top-up', amount: 24_000, day: 19, spread: 0.25 },
  { category: 'transportation', description: 'Fuel', amount: 38_000, day: 7, spread: 0.2 },
  { category: 'transportation', description: 'Ride-hailing', amount: 16_000, day: 21, spread: 0.3 },
  { category: 'utilities', description: 'Electricity units', amount: 22_000, day: 4, spread: 0.22 },
  { category: 'utilities', description: 'Mobile data bundle', amount: 15_000, day: 2 },
  { category: 'utilities', description: 'Internet subscription', amount: 21_000, day: 8 },
  { category: 'dining', description: 'Lunch at work', amount: 18_000, day: 12, spread: 0.3 },
  {
    category: 'dining',
    description: 'Dinner out',
    amount: 14_000,
    day: 24,
    probability: 0.7,
    spread: 0.35,
  },
  { category: 'entertainment', description: 'Streaming subscriptions', amount: 6_500, day: 10 },
  {
    category: 'entertainment',
    description: 'Cinema and outings',
    amount: 12_000,
    day: 26,
    probability: 0.55,
  },
  {
    category: 'personal',
    description: 'Barber and toiletries',
    amount: 11_000,
    day: 15,
    spread: 0.2,
  },
  {
    category: 'shopping',
    description: 'Clothing',
    amount: 28_000,
    day: 18,
    probability: 0.45,
    spread: 0.4,
  },
  { category: 'healthcare', description: 'Pharmacy', amount: 9_000, day: 14, probability: 0.5 },
  { category: 'family', description: 'Support to family', amount: 40_000, day: 28 },
  { category: 'giving', description: 'Monthly giving', amount: 15_000, day: 28 },
];

async function seed(): Promise<void> {
  if (isProduction) {
    throw new Error('Refusing to seed a production database');
  }

  await connectDatabase();
  logger.info('Seeding Savewise demo data…');

  const email = env.SEED_DEMO_EMAIL;

  // Idempotent: rerunning the seed rebuilds the demo account from scratch
  // without touching anything else in the database.
  const existing = await User.findOne({ email }).exec();
  if (existing) {
    await Promise.all([
      Transaction.deleteMany({ userId: existing._id }).exec(),
      SavingsGoal.deleteMany({ userId: existing._id }).exec(),
      Budget.deleteMany({ userId: existing._id }).exec(),
      SavingsPlan.deleteMany({ userId: existing._id }).exec(),
      Notification.deleteMany({ userId: existing._id }).exec(),
      Session.deleteMany({ userId: existing._id }).exec(),
    ]);
    await existing.deleteOne();
    logger.info('Removed the previous demo account');
  }

  const user = await User.create({
    firstName: 'Chinedu',
    lastName: 'Okafor',
    email,
    passwordHash: await User.hashPassword(env.SEED_DEMO_PASSWORD),
    currency: 'NGN',
    monthlyIncome: toMinor(520_000),
    onboardingCompleted: true,
    preferences: {
      targetMonthlySavings: toMinor(120_000),
      priorities: ['emergency_fund', 'big_purchase', 'invest'],
      budgetAlertThreshold: 80,
      notifyOnGoalMilestone: true,
      notifyOnBudgetExceeded: true,
    },
  });

  const userId = user._id;
  const months = recentMonths(MONTHS_OF_HISTORY);
  const currentMonth = toMonthKey();

  /* ------------------------------- Goals -------------------------------- */

  const goals = await SavingsGoal.create([
    {
      userId,
      name: 'Emergency Fund',
      description: 'Three months of essential expenses, kept liquid.',
      category: 'emergency',
      targetAmount: toMinor(1_200_000),
      currentAmount: 0,
      monthlyContribution: toMinor(55_000),
      deadline: addMonths(new Date(), 10),
      priority: 'high',
      status: 'active',
    },
    {
      userId,
      name: 'Rent 2027',
      description: 'Next annual rent, saved ahead so it is never a scramble.',
      category: 'rent',
      targetAmount: toMinor(2_400_000),
      currentAmount: 0,
      monthlyContribution: toMinor(45_000),
      // Deliberately unreachable at the current rate — this is the goal the
      // insights engine flags as behind schedule, which is worth demonstrating.
      deadline: addMonths(new Date(), 11),
      priority: 'high',
      status: 'active',
    },
    {
      userId,
      name: 'MacBook Pro',
      description: 'Replacing a five-year-old machine.',
      category: 'device',
      targetAmount: toMinor(950_000),
      currentAmount: 0,
      monthlyContribution: toMinor(25_000),
      deadline: addMonths(new Date(), 14),
      priority: 'medium',
      status: 'active',
    },
    {
      userId,
      name: 'Lagos to Cape Town',
      description: 'December trip with friends.',
      category: 'travel',
      targetAmount: toMinor(900_000),
      currentAmount: 0,
      monthlyContribution: toMinor(30_000),
      deadline: addMonths(new Date(), 8),
      priority: 'low',
      status: 'paused',
    },
  ]);

  const [emergencyFund, rentGoal, laptopGoal] = goals;

  /* ---------------------------- Transactions ---------------------------- */

  const transactions: Record<string, unknown>[] = [];
  const goalTotals = new Map<string, number>();

  const addContribution = (goal: (typeof goals)[number], amount: number, date: Date) => {
    transactions.push({
      userId,
      type: 'saving',
      amount,
      category: 'savings',
      description: `Contribution to ${goal.name}`,
      date,
      goalId: goal._id,
    });
    const key = goal._id.toString();
    goalTotals.set(key, (goalTotals.get(key) ?? 0) + amount);
  };

  months.forEach((month, index) => {
    const isCurrentMonth = month === currentMonth;
    const today = new Date();
    // Only seed days that have actually happened in the current month, so the
    // "spending so far" figures are honest rather than time-travelling.
    const lastDay = isCurrentMonth ? today.getUTCDate() : 31;

    // Salary, with a raise partway through the history.
    const salary = index >= MONTHS_OF_HISTORY - 3 ? 520_000 : 470_000;
    if (lastDay >= 1) {
      transactions.push({
        userId,
        type: 'income',
        amount: toMinor(salary),
        category: 'salary',
        description: 'Monthly salary',
        date: dayIn(month, 1),
      });
    }

    // Irregular freelance income.
    if (random() < 0.5 && lastDay >= 16) {
      transactions.push({
        userId,
        type: 'income',
        amount: vary(85_000, 0.4),
        category: 'freelance',
        description: 'Freelance project',
        date: dayIn(month, 16),
      });
    }

    for (const template of MONTHLY_EXPENSES) {
      if (template.day > lastDay) continue;
      if (template.probability !== undefined && random() > template.probability) continue;

      transactions.push({
        userId,
        type: 'expense',
        amount: vary(template.amount, template.spread ?? 0.12),
        category: template.category,
        description: template.description,
        date: dayIn(month, template.day),
      });
    }

    // The annual rent payment, four months back — a genuine lump that makes the
    // trend chart and the insight engine earn their keep.
    if (index === MONTHS_OF_HISTORY - 5 && lastDay >= 10) {
      transactions.push({
        userId,
        type: 'expense',
        amount: toMinor(2_200_000),
        category: 'housing',
        description: 'Annual rent',
        date: dayIn(month, 10),
      });
    }

    // Regular goal contributions.
    if (lastDay >= 2 && emergencyFund)
      addContribution(emergencyFund, vary(55_000, 0.08), dayIn(month, 2));
    if (lastDay >= 2 && rentGoal) addContribution(rentGoal, vary(45_000, 0.05), dayIn(month, 2));
    if (lastDay >= 20 && laptopGoal && random() < 0.75) {
      addContribution(laptopGoal, vary(25_000, 0.15), dayIn(month, 20));
    }
  });

  // Recorded on the first day of the history so the running balance starts
  // from something real rather than from zero.
  transactions.unshift({
    userId,
    type: 'income',
    amount: toMinor(OPENING_BALANCE),
    category: 'other_income',
    description: 'Opening balance',
    date: dayIn(months[0] ?? currentMonth, 1),
    notes: 'Money already on hand when tracking started.',
  });

  await Transaction.insertMany(transactions);

  // Goal balances are derived from the contributions actually written, so the
  // ledger and the goal documents agree — exactly as the API maintains them.
  for (const goal of goals) {
    const total = goalTotals.get(goal._id.toString()) ?? 0;
    goal.currentAmount = Math.min(total, goal.targetAmount);
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
      goal.completedAt = new Date();
      goal.lastMilestone = 100;
    }
    await goal.save();
  }

  /* ------------------------------- Budgets ------------------------------- */

  const budgetLines: { category: ExpenseCategoryKey; budgeted: number }[] = [
    { category: 'housing', budgeted: toMinor(30_000) },
    { category: 'food', budgeted: toMinor(90_000) },
    { category: 'transportation', budgeted: toMinor(55_000) },
    { category: 'utilities', budgeted: toMinor(60_000) },
    { category: 'healthcare', budgeted: toMinor(15_000) },
    { category: 'dining', budgeted: toMinor(30_000) },
    { category: 'entertainment', budgeted: toMinor(20_000) },
    { category: 'shopping', budgeted: toMinor(25_000) },
    { category: 'personal', budgeted: toMinor(15_000) },
    { category: 'family', budgeted: toMinor(40_000) },
    { category: 'giving', budgeted: toMinor(15_000) },
  ];

  await Budget.insertMany(
    months.slice(-4).map((month) => ({
      userId,
      month,
      plannedIncome: toMinor(520_000),
      plannedSavings: toMinor(120_000),
      categories: budgetLines,
      notes: month === currentMonth ? 'Trimmed dining after last month.' : null,
    })),
  );

  /* -------------------------------- Plans -------------------------------- */

  await SavingsPlan.insertMany([
    {
      userId,
      name: 'Emergency fund top-up',
      goalId: emergencyFund?._id ?? null,
      targetAmount: toMinor(1_200_000),
      contributionAmount: toMinor(55_000),
      contributedAmount: goalTotals.get(emergencyFund?._id.toString() ?? '') ?? 0,
      frequency: 'monthly',
      startDate: dayIn(months[0] ?? currentMonth, 2),
      status: 'active',
    },
    {
      userId,
      name: 'Rent runway',
      goalId: rentGoal?._id ?? null,
      targetAmount: toMinor(2_400_000),
      contributionAmount: toMinor(11_000),
      contributedAmount: goalTotals.get(rentGoal?._id.toString() ?? '') ?? 0,
      frequency: 'weekly',
      startDate: dayIn(months[0] ?? currentMonth, 2),
      status: 'active',
    },
    {
      userId,
      name: 'Laptop fund',
      goalId: laptopGoal?._id ?? null,
      targetAmount: toMinor(950_000),
      contributionAmount: toMinor(12_500),
      contributedAmount: goalTotals.get(laptopGoal?._id.toString() ?? '') ?? 0,
      frequency: 'biweekly',
      startDate: dayIn(months[2] ?? currentMonth, 20),
      status: 'active',
    },
  ]);

  /* ---------------------------- Notifications ---------------------------- */

  await Notification.insertMany([
    {
      userId,
      type: 'goal_milestone',
      title: 'Emergency Fund is 25% funded',
      body: 'Eight months of steady contributions are showing.',
      href: '/goals',
      read: false,
      dedupeKey: `seed:${userId.toString()}:milestone-25`,
    },
    {
      userId,
      type: 'insight_ready',
      title: 'Your monthly review is ready',
      body: 'Spending, savings rate and goal pace for this month.',
      href: '/insights',
      read: false,
      dedupeKey: `seed:${userId.toString()}:insight`,
    },
  ]);

  const counts = {
    transactions: transactions.length,
    goals: goals.length,
    months: months.length,
  };

  logger.info(counts, 'Seed complete');
  process.stdout.write(
    `\n  Savewise demo data ready\n\n` +
      `    Email     ${email}\n` +
      `    Password  ${env.SEED_DEMO_PASSWORD}\n\n` +
      `    ${counts.transactions} transactions across ${counts.months} months, ${counts.goals} goals.\n` +
      `    Development credentials only — never reuse them anywhere real.\n\n`,
  );
}

seed()
  .then(() => disconnectDatabase())
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.fatal({ err: error }, 'Seeding failed');
    void disconnectDatabase().finally(() => process.exit(1));
  });
