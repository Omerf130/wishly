import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/database/dates';
import { enableForeignKeys } from '@/database/foreignKeys';
import { migration001Initial, MIGRATION_VERSION as V1 } from '@/database/migrations/001_initial';
import { ensureCoreSchemaPresent } from '@/database/schema';

type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

const MIGRATIONS: Migration[] = [
  { version: V1, up: migration001Initial },
];

export async function ensureSchemaMigrationsTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

async function getAppliedVersions(db: SQLiteDatabase): Promise<Set<number>> {
  const rows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC',
  );
  return new Set(rows.map((row) => row.version));
}

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await enableForeignKeys(db);
  await ensureSchemaMigrationsTable(db);
  const applied = await getAppliedVersions(db);

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) {
      continue;
    }

    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
        migration.version,
        nowIso(),
      );
    });
  }

  await ensureCoreSchemaPresent(db);
}
