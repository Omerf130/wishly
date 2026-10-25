import type { SQLiteDatabase } from 'expo-sqlite';

import { mapDreamRow, mapTransactionRow } from '@/database/mappers';
import { runInExclusiveTransaction } from '@/database/foreignKeys';
import { BACKUP_DREAMS_SQL, BACKUP_SAVINGS_TRANSACTIONS_SQL } from '@/database/backupSnapshotSql';
import type { WishlyBackupSnapshot } from '@/database/backupSnapshotTypes';

export type { WishlyBackupSnapshot } from '@/database/backupSnapshotTypes';
export { BACKUP_DREAMS_SQL, BACKUP_SAVINGS_TRANSACTIONS_SQL } from '@/database/backupSnapshotSql';

export async function getEffectiveSchemaVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_migrations',
  );
  const version = row?.version;
  if (version != null && Number.isInteger(version) && version > 0) {
    return version;
  }
  return 2;
}

/**
 * Consistent read of dreams and linked savings transactions under BEGIN IMMEDIATE.
 * Does not modify data. Orphan transactions are not included.
 */
export async function readWishlyBackupSnapshot(db: SQLiteDatabase): Promise<WishlyBackupSnapshot> {
  let snapshot: WishlyBackupSnapshot | null = null;

  await runInExclusiveTransaction(db, async (txn) => {
    const schemaVersion = await getEffectiveSchemaVersion(txn);
    const dreamRows = await txn.getAllAsync<Parameters<typeof mapDreamRow>[0]>(BACKUP_DREAMS_SQL);
    const transactionRows = await txn.getAllAsync<Parameters<typeof mapTransactionRow>[0]>(
      BACKUP_SAVINGS_TRANSACTIONS_SQL,
    );

    snapshot = {
      schemaVersion,
      dreams: dreamRows.map(mapDreamRow),
      savingsTransactions: transactionRows.map(mapTransactionRow),
    };
  });

  if (!snapshot) {
    throw new Error('קריאת snapshot לגיבוי נכשלה');
  }

  return snapshot;
}
