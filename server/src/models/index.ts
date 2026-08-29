/**
 * Registers every Mongoose model. Imported once at boot so `syncIndexes()` can
 * see the full set, and so `ref:` lookups resolve regardless of import order.
 */

export { User, type UserDocument, type UserAttributes, BCRYPT_ROUNDS } from './User.js';
export { Session, type SessionDocument } from './Session.js';
export {
  Transaction,
  type TransactionDocument,
  type TransactionAttributes,
} from './Transaction.js';
export {
  SavingsGoal,
  type SavingsGoalDocument,
  type SavingsGoalAttributes,
} from './SavingsGoal.js';
export {
  Budget,
  type BudgetDocument,
  type BudgetAttributes,
  type BudgetCategoryLine,
} from './Budget.js';
export {
  SavingsPlan,
  type SavingsPlanDocument,
  type SavingsPlanAttributes,
} from './SavingsPlan.js';
export { Notification, type NotificationDocument } from './Notification.js';
