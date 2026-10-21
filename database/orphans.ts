import type { SQLiteDatabase } from 'expo-sqlite';

import { runInExclusiveTransaction } from '@/database/foreignKeys';

export type OrphanTransactionRecord = {
  id: string;
  dreamId: string;
  type: 'deposit' | 'withdrawal';
  amountAgorot: number;
  note: string | null;
  createdAt: string;
  provablyDevSelfTest: boolean;
  classificationReason: string;
};

export type OrphanTransactionsReport = {
  totalCount: number;
  provablyDevSelfTestCount: number;
  unclassifiedCount: number;
  totalAmountAgorotDeposits: number;
  totalAmountAgorotWithdrawals: number;
  records: OrphanTransactionRecord[];
};

const DEV_SELFTEST_NOTE_MARKERS = ['[DEV-SELFTEST', '[DEV-SELFTEST-DECOY'] as const;

function includesDevSelfTestMarker(note: string | null): boolean {
  if (!note) {
    return false;
  }
  return DEV_SELFTEST_NOTE_MARKERS.some((marker) => note.includes(marker));
}

function classifyOrphanRow(row: {
  id: string;
  dream_id: string;
  type: string;
  amount: number;
  note: string | null;
  created_at: string;
}): OrphanTransactionRecord {
  const note = row.note;
  const provablyDevSelfTest = includesDevSelfTestMarker(note);
  let classificationReason = provablyDevSelfTest
    ? 'הערה מכילה סימון בדיקת פיתוח [DEV-SELFTEST]'
    : 'לא ניתן להוכיח מבדיקת פיתוח — ייתכן שאריות מ-CASCADE שנכשל או נתון אחר';

  return {
    id: row.id,
    dreamId: row.dream_id,
    type: row.type as 'deposit' | 'withdrawal',
    amountAgorot: row.amount,
    note,
    createdAt: row.created_at,
    provablyDevSelfTest,
    classificationReason,
  };
}

export async function listOrphanTransactions(
  db: SQLiteDatabase,
): Promise<OrphanTransactionRecord[]> {
  const rows = await db.getAllAsync<{
    id: string;
    dream_id: string;
    type: string;
    amount: number;
    note: string | null;
    created_at: string;
  }>(
    `SELECT st.id, st.dream_id, st.type, st.amount, st.note, st.created_at
     FROM savings_transactions st
     WHERE NOT EXISTS (SELECT 1 FROM dreams d WHERE d.id = st.dream_id)
     ORDER BY st.created_at ASC, st.id ASC;`,
  );
  return rows.map(classifyOrphanRow);
}

export async function buildOrphanTransactionsReport(
  db: SQLiteDatabase,
): Promise<OrphanTransactionsReport> {
  const records = await listOrphanTransactions(db);
  let totalAmountAgorotDeposits = 0;
  let totalAmountAgorotWithdrawals = 0;
  let provablyDevSelfTestCount = 0;

  for (const record of records) {
    if (record.type === 'deposit') {
      totalAmountAgorotDeposits += record.amountAgorot;
    } else {
      totalAmountAgorotWithdrawals += record.amountAgorot;
    }
    if (record.provablyDevSelfTest) {
      provablyDevSelfTestCount += 1;
    }
  }

  return {
    totalCount: records.length,
    provablyDevSelfTestCount,
    unclassifiedCount: records.length - provablyDevSelfTestCount,
    totalAmountAgorotDeposits,
    totalAmountAgorotWithdrawals,
    records,
  };
}

export function formatOrphanTransactionsReport(report: OrphanTransactionsReport): string {
  const lines: string[] = [
    '=== Wishly — דוח פעולות יתומות (savings_transactions) ===',
    `סה"כ: ${report.totalCount}`,
    `מסומנות כבטוחות לבדיקת פיתוח: ${report.provablyDevSelfTestCount}`,
    `לא מסווגות / דורשות סקירה: ${report.unclassifiedCount}`,
    `סכום הפקדות (אגורות): ${report.totalAmountAgorotDeposits}`,
    `סכום משיכות (אגורות): ${report.totalAmountAgorotWithdrawals}`,
    '',
  ];

  for (const row of report.records) {
    lines.push(
      [
        `tx=${row.id}`,
        `dream_id=${row.dreamId}`,
        `type=${row.type}`,
        `amount=${row.amountAgorot}`,
        `note=${row.note ?? '(null)'}`,
        `created_at=${row.createdAt}`,
        `provablyDev=${row.provablyDevSelfTest}`,
        `reason=${row.classificationReason}`,
      ].join(' | '),
    );
  }

  if (report.records.length === 0) {
    lines.push('(אין פעולות יתומות)');
  }

  return lines.join('\n');
}

/**
 * Deletes only orphan transactions explicitly marked in their note as dev self-test.
 * Does not run automatically — call from dev UI after user confirmation.
 */
export async function deleteProvablyDevOrphanTransactions(
  db: SQLiteDatabase,
): Promise<{ deletedCount: number; deletedIds: string[] }> {
  const report = await buildOrphanTransactionsReport(db);
  const idsToDelete = report.records
    .filter((row) => row.provablyDevSelfTest)
    .map((row) => row.id);

  if (idsToDelete.length === 0) {
    return { deletedCount: 0, deletedIds: [] };
  }

  const deletedIds: string[] = [];

  await runInExclusiveTransaction(db, async (txn) => {
    for (const id of idsToDelete) {
      const row = await txn.getFirstAsync<{ id: string; dream_id: string; note: string | null }>(
        `SELECT st.id, st.dream_id, st.note FROM savings_transactions st
         WHERE st.id = ?
           AND NOT EXISTS (SELECT 1 FROM dreams d WHERE d.id = st.dream_id);`,
        id,
      );
      if (!row || !includesDevSelfTestMarker(row.note)) {
        continue;
      }
      await txn.runAsync('DELETE FROM savings_transactions WHERE id = ?', id);
      deletedIds.push(id);
    }
  });

  return { deletedCount: deletedIds.length, deletedIds };
}
