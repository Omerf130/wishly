import type { SQLiteDatabase } from 'expo-sqlite';

import { listSavingsHistoryPage } from '@/database/savingsHistoryRepository';

export type RecentSavingsActivityItem = {
  transactionId: string;
  dreamId: string;
  dreamTitle: string;
  type: 'deposit' | 'withdrawal';
  amountAgorot: number;
  note: string | null;
  createdAt: string;
};

type RecentSavingsActivityRow = {
  transaction_id: string;
  dream_id: string;
  dream_title: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string | null;
  created_at: string;
};

export function mapRecentSavingsActivityRow(
  row: RecentSavingsActivityRow,
): RecentSavingsActivityItem {
  return {
    transactionId: row.transaction_id,
    dreamId: row.dream_id,
    dreamTitle: row.dream_title,
    type: row.type,
    amountAgorot: Math.trunc(row.amount),
    note: row.note,
    createdAt: row.created_at,
  };
}

/** Matches SQL ORDER BY datetime(created_at) DESC, id DESC for tests. */
export function compareRecentSavingsActivityNewestFirst(
  a: Pick<RecentSavingsActivityItem, 'createdAt' | 'transactionId'>,
  b: Pick<RecentSavingsActivityItem, 'createdAt' | 'transactionId'>,
): number {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  const aValid = !Number.isNaN(aTime);
  const bValid = !Number.isNaN(bTime);

  if (aValid && bValid && aTime !== bTime) {
    return bTime - aTime;
  }
  if (a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt);
  }
  return b.transactionId.localeCompare(a.transactionId);
}

export function formatRecentSavingsActivityDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Five most recent savings actions for active (non-archived) dreams.
 * Orphan transactions (no dream row) are excluded by INNER JOIN.
 */
export async function listRecentSavingsActivity(
  db: SQLiteDatabase,
  limit = 5,
): Promise<RecentSavingsActivityItem[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const page = await listSavingsHistoryPage(db, {
    typeFilter: 'all',
    dreamId: null,
    limit: safeLimit,
    cursor: null,
  });
  return page.items;
}
