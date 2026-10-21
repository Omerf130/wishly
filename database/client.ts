import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME } from '@/database/constants';
import { enableForeignKeys } from '@/database/foreignKeys';
import { runMigrations } from '@/database/migrations';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate(DATABASE_NAME);
  }
  return databasePromise;
}

export async function openDatabaseByName(databaseName: string): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(databaseName);
  await enableForeignKeys(db);
  await runMigrations(db);
  await enableForeignKeys(db);
  return db;
}

async function openAndMigrate(databaseName: string): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(databaseName);
  await enableForeignKeys(db);
  await runMigrations(db);
  await enableForeignKeys(db);
  return db;
}

/** For tests — reset singleton between runs. */
export function resetDatabaseSingletonForTests(): void {
  databasePromise = null;
}
