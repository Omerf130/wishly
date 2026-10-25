export { DATABASE_NAME, CURRENT_SCHEMA_VERSION } from '@/database/constants';
export { getDatabase, openDatabaseByName, resetDatabaseSingletonForTests } from '@/database/client';
export { runMigrations } from '@/database/migrations';
export { areForeignKeysEnabled, enableForeignKeys } from '@/database/foreignKeys';
export {
  ensureCoreSchemaPresent,
  listUserTableNames,
  readDatabaseList,
  CORE_USER_TABLES,
} from '@/database/schema';

export {
  buildOrphanTransactionsReport,
  deleteProvablyDevOrphanTransactions,
  formatOrphanTransactionsReport,
  listOrphanTransactions,
  type OrphanTransactionRecord,
  type OrphanTransactionsReport,
} from '@/database/orphans';
export { ilsToAgorot, agorotToIls } from '@/database/money';

export {
  createDream,
  getDreamById,
  listDreams,
  updateDream,
  countDreamsWithLocalImageReference,
  archiveDream,
  deleteDream,
  deleteDreamWithLocalImageCleanup,
} from '@/database/dreamsRepository';

export {
  addDeposit,
  addWithdrawal,
  listTransactionsByDream,
  updateTransaction,
  deleteTransaction,
  getSavedAmountForDream,
} from '@/database/transactionsRepository';

export {
  getFinancialActivitySummary,
  buildFinancialActivitySummaryFromTotals,
  computeFinancialProgressMetrics,
  type DreamBalanceTarget,
  type FinancialActivitySummary,
} from '@/database/financialActivitySummary';

export {
  listRecentSavingsActivity,
  mapRecentSavingsActivityRow,
  compareRecentSavingsActivityNewestFirst,
  formatRecentSavingsActivityDate,
  type RecentSavingsActivityItem,
} from '@/database/recentSavingsActivity';

export {
  buildSavingsHistorySql,
  listSavingsHistoryPage,
  listActiveDreamFilterOptions,
  mergeSavingsHistoryItems,
  type SavingsHistoryTypeFilter,
  type SavingsHistoryQuery,
  type SavingsHistoryPage,
  type SavingsHistoryCursor,
  type DreamFilterOption,
} from '@/database/savingsHistoryRepository';

export {
  listSavingsTimelineTransactions,
  type SavingsTimelineTransaction,
  type SavingsProgressChartPoint,
  type SavingsProgressChartSeries,
  type SavingsProgressChartMode,
} from '@/database/savingsProgressTimeline';

export {
  runWishlyDatabaseSelfTest,
  summarizeSelfTestResults,
  formatCascadeDeleteDiagnosticReport,
  type SelfTestResult,
  type CascadeDeleteDiagnostic,
  type WishlyDatabaseSelfTestOutput,
} from '@/database/selfTest';

export type {
  CreateDreamInput,
  UpdateDreamInput,
  CreateTransactionInput,
  UpdateTransactionInput,
  DreamRecord,
  SavingsTransactionRecord,
} from '@/types/database';
