import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_VERSION = 2;

async function dreamColumnNames(db: SQLiteDatabase): Promise<Set<string>> {
  const rows = await db.getAllAsync<{ name: string }>('PRAGMA table_info(dreams);');
  return new Set(rows.map((row) => row.name));
}

export async function migration002DreamSavingsPlan(db: SQLiteDatabase): Promise<void> {
  const columns = await dreamColumnNames(db);

  if (!columns.has('target_date')) {
    await db.execAsync(`ALTER TABLE dreams ADD COLUMN target_date TEXT;`);
  }

  if (columns.has('planned_monthly_saving') && !columns.has('monthly_savings_agorot')) {
    await db.execAsync(
      `ALTER TABLE dreams RENAME COLUMN planned_monthly_saving TO monthly_savings_agorot;`,
    );
  } else if (!columns.has('monthly_savings_agorot')) {
    await db.execAsync(`
      ALTER TABLE dreams ADD COLUMN monthly_savings_agorot INTEGER
        CHECK (monthly_savings_agorot IS NULL OR monthly_savings_agorot > 0);
    `);
  }
}
