import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

import { DATABASE_NAME } from '@/database/constants';
import { assertSameDatabaseFile } from '@/database/schema';

type ForeignKeyCapable = Pick<SQLiteDatabase, 'execAsync' | 'getFirstAsync'>;

/**
 * Must run on a SQLite connection while it is **not** inside an active transaction.
 * (Setting this inside BEGIN…COMMIT has no effect until the next transaction.)
 */
export async function enableForeignKeys(db: ForeignKeyCapable): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
}

export async function areForeignKeysEnabled(db: ForeignKeyCapable): Promise<boolean> {
  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
  return row?.foreign_keys === 1;
}

/**
 * Opens a second connection to the same database file (not `openDatabaseAsync(databasePath)` —
 * expo expects a file *name* under the default directory, not an absolute path).
 */
async function openWriteConnection(primary: SQLiteDatabase): Promise<SQLiteDatabase> {
  const txnDb = await openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
  assertSameDatabaseFile(primary, txnDb);
  return txnDb;
}

/**
 * Runs `task` in a write transaction with foreign-key enforcement enabled on the
 * connection that executes the SQL.
 */
export async function runInExclusiveTransaction(
  db: SQLiteDatabase,
  task: (txn: SQLiteDatabase) => Promise<void>,
): Promise<void> {
  await enableForeignKeys(db);

  if (Platform.OS === 'web') {
    await db.withTransactionAsync(async () => {
      await task(db);
    });
    return;
  }

  const txnDb = await openWriteConnection(db);
  try {
    await enableForeignKeys(txnDb);
    if (!(await areForeignKeysEnabled(txnDb))) {
      throw new Error('SQLite foreign_keys could not be enabled on transaction connection');
    }

    await txnDb.execAsync('BEGIN IMMEDIATE;');
    try {
      await task(txnDb);
      await txnDb.execAsync('COMMIT;');
    } catch (error) {
      await txnDb.execAsync('ROLLBACK;');
      throw error;
    }
  } finally {
    await txnDb.closeAsync();
  }
}
