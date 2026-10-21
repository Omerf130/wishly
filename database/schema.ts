import type { SQLiteDatabase } from 'expo-sqlite';

import { DatabaseError } from '@/database/errors';
import { migration001Initial, MIGRATION_VERSION as V1 } from '@/database/migrations/001_initial';

export const CORE_USER_TABLES = ['schema_migrations', 'dreams', 'savings_transactions'] as const;

export type DatabaseListRow = {
  seq: number;
  name: string;
  file: string;
};

export async function listUserTableNames(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name;`,
  );
  return rows.map((row) => row.name);
}

export async function readDatabaseList(db: SQLiteDatabase): Promise<DatabaseListRow[]> {
  return db.getAllAsync<DatabaseListRow>('PRAGMA database_list;');
}

/**
 * Ensures core tables exist on this connection. If migration v1 is recorded but tables
 * are missing, re-runs migration 001 (CREATE IF NOT EXISTS) without touching schema_migrations.
 */
export async function ensureCoreSchemaPresent(db: SQLiteDatabase): Promise<void> {
  const present = new Set(await listUserTableNames(db));
  const missing = CORE_USER_TABLES.filter((name) => !present.has(name));
  if (missing.length === 0) {
    return;
  }

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_migrations WHERE version = ?',
    V1,
  );

  if (versionRow) {
    await migration001Initial(db);
    const after = new Set(await listUserTableNames(db));
    const stillMissing = CORE_USER_TABLES.filter((name) => !after.has(name));
    if (stillMissing.length > 0) {
      throw new DatabaseError(
        `טבלאות חסרות גם לאחר התאוששות: ${stillMissing.join(', ')}`,
      );
    }
    return;
  }

  throw new DatabaseError(`טבלאות ליבה חסרות: ${missing.join(', ')}`);
}

export function assertSameDatabaseFile(
  primary: SQLiteDatabase,
  secondary: SQLiteDatabase,
): void {
  if (primary.databasePath !== secondary.databasePath) {
    throw new DatabaseError(
      `חיבור SQLite שונה: ראשי=${primary.databasePath ?? '?'} txn=${secondary.databasePath ?? '?'}`,
    );
  }
}
