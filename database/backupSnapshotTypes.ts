import type { DreamRecord, SavingsTransactionRecord } from '@/types/database';

export type WishlyBackupSnapshot = {
  schemaVersion: number;
  dreams: DreamRecord[];
  savingsTransactions: SavingsTransactionRecord[];
};
