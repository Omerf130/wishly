import type { SQLiteDatabase } from 'expo-sqlite';

export type FinancialActivitySummary = {
  totalSavedAgorot: number;
  totalDepositsAgorot: number;
  totalWithdrawalsAgorot: number;
  transactionCount: number;
  dreamCount: number;
  totalTargetAgorot: number;
  totalRemainingAgorot: number;
  overallProgressPercent: number;
  completedDreamsCount: number;
};

export type DreamBalanceTarget = {
  savedAgorot: number;
  targetAgorot: number;
};

/**
 * Progress and remaining from per-dream saved/target (agorot integers).
 * Saved above target credits only up to target; remaining never goes negative.
 */
export function computeFinancialProgressMetrics(dreams: DreamBalanceTarget[]): {
  totalTargetAgorot: number;
  totalRemainingAgorot: number;
  overallProgressPercent: number;
  completedDreamsCount: number;
} {
  let totalTargetAgorot = 0;
  let totalCreditedSavedAgorot = 0;
  let totalRemainingAgorot = 0;
  let completedDreamsCount = 0;

  for (const row of dreams) {
    const saved = Math.trunc(row.savedAgorot);
    const target = Math.trunc(row.targetAgorot);
    totalTargetAgorot += target;
    const savedNonNeg = Math.max(0, saved);
    const credited = target > 0 ? Math.min(savedNonNeg, target) : 0;
    totalCreditedSavedAgorot += credited;
    totalRemainingAgorot += Math.max(0, target - saved);
    if (target > 0 && saved >= target) {
      completedDreamsCount += 1;
    }
  }

  let overallProgressPercent = 0;
  if (totalTargetAgorot > 0) {
    overallProgressPercent = Math.min(
      100,
      Math.max(0, Math.round((totalCreditedSavedAgorot / totalTargetAgorot) * 100)),
    );
  }

  return {
    totalTargetAgorot,
    totalRemainingAgorot,
    overallProgressPercent,
    completedDreamsCount,
  };
}

/**
 * Aggregates activity for non-archived dreams only.
 * Transactions are included via INNER JOIN — orphan rows (missing dream) are excluded.
 */
export async function getFinancialActivitySummary(
  db: SQLiteDatabase,
): Promise<FinancialActivitySummary> {
  const dreamCountRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM dreams WHERE status != 'archived'`,
  );

  const aggRow = await db.getFirstAsync<{
    deposits: number;
    withdrawals: number;
    tx_count: number;
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE 0 END), 0) AS deposits,
      COALESCE(SUM(CASE WHEN t.type = 'withdrawal' THEN t.amount ELSE 0 END), 0) AS withdrawals,
      COUNT(t.id) AS tx_count
    FROM savings_transactions t
    INNER JOIN dreams d ON d.id = t.dream_id
    WHERE d.status != 'archived'`,
  );

  const perDreamRows = await db.getAllAsync<{
    target_agorot: number;
    saved_agorot: number;
  }>(
    `SELECT
      d.target_amount AS target_agorot,
      COALESCE(SUM(
        CASE
          WHEN t.type = 'deposit' THEN t.amount
          WHEN t.type = 'withdrawal' THEN -t.amount
          ELSE 0
        END
      ), 0) AS saved_agorot
    FROM dreams d
    LEFT JOIN savings_transactions t ON t.dream_id = d.id
    WHERE d.status != 'archived'
    GROUP BY d.id, d.target_amount`,
  );

  const progress = computeFinancialProgressMetrics(
    perDreamRows.map((row) => ({
      savedAgorot: Math.trunc(row.saved_agorot),
      targetAgorot: Math.trunc(row.target_agorot),
    })),
  );

  const totalDepositsAgorot = Math.trunc(aggRow?.deposits ?? 0);
  const totalWithdrawalsAgorot = Math.trunc(aggRow?.withdrawals ?? 0);

  return {
    totalSavedAgorot: totalDepositsAgorot - totalWithdrawalsAgorot,
    totalDepositsAgorot,
    totalWithdrawalsAgorot,
    transactionCount: aggRow?.tx_count ?? 0,
    dreamCount: dreamCountRow?.count ?? 0,
    totalTargetAgorot: progress.totalTargetAgorot,
    totalRemainingAgorot: progress.totalRemainingAgorot,
    overallProgressPercent: progress.overallProgressPercent,
    completedDreamsCount: progress.completedDreamsCount,
  };
}

/** Pure helper for unit-style checks (no SQLite). */
export function buildFinancialActivitySummaryFromTotals(input: {
  totalDepositsAgorot: number;
  totalWithdrawalsAgorot: number;
  transactionCount: number;
  dreamCount: number;
  dreams?: DreamBalanceTarget[];
}): FinancialActivitySummary {
  const totalDepositsAgorot = Math.trunc(input.totalDepositsAgorot);
  const totalWithdrawalsAgorot = Math.trunc(input.totalWithdrawalsAgorot);
  const progress = computeFinancialProgressMetrics(input.dreams ?? []);
  return {
    totalSavedAgorot: totalDepositsAgorot - totalWithdrawalsAgorot,
    totalDepositsAgorot,
    totalWithdrawalsAgorot,
    transactionCount: input.transactionCount,
    dreamCount: input.dreamCount,
    totalTargetAgorot: progress.totalTargetAgorot,
    totalRemainingAgorot: progress.totalRemainingAgorot,
    overallProgressPercent: progress.overallProgressPercent,
    completedDreamsCount: progress.completedDreamsCount,
  };
}
