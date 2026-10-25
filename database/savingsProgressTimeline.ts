import type { SQLiteDatabase } from 'expo-sqlite';

export type SavingsTimelineTransaction = {
  transactionId: string;
  type: 'deposit' | 'withdrawal';
  amountAgorot: number;
  createdAt: string;
};

export type SavingsProgressChartMode = 'singleDay' | 'multiDay';

export type SavingsProgressChartPoint = {
  pointId: string;
  balanceAgorot: number;
  dayYmd: string;
  createdAt?: string;
  isOpeningAnchor?: boolean;
  isTodayAnchor?: boolean;
  transactionType?: 'deposit' | 'withdrawal';
  transactionAmountAgorot?: number;
  sequenceIndex?: number;
};

export type SavingsProgressChartSeries = {
  mode: SavingsProgressChartMode;
  points: SavingsProgressChartPoint[];
};

const TIMELINE_SQL = `SELECT
  t.id AS transaction_id,
  t.type AS type,
  t.amount AS amount,
  t.created_at AS created_at
FROM savings_transactions t
INNER JOIN dreams d ON d.id = t.dream_id
WHERE d.status != 'archived'
ORDER BY datetime(t.created_at) ASC, t.id ASC`;

export async function listSavingsTimelineTransactions(
  db: SQLiteDatabase,
): Promise<SavingsTimelineTransaction[]> {
  const rows = await db.getAllAsync<{
    transaction_id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    created_at: string;
  }>(TIMELINE_SQL);

  return rows.map((row) => ({
    transactionId: row.transaction_id,
    type: row.type,
    amountAgorot: Math.trunc(row.amount),
    createdAt: row.created_at,
  }));
}
