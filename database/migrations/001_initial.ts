import type { SQLiteDatabase } from 'expo-sqlite';

export const MIGRATION_VERSION = 1;

export async function migration001Initial(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dreams (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_amount INTEGER NOT NULL CHECK (target_amount > 0),
      image_type TEXT NOT NULL CHECK (image_type IN ('builtIn', 'local')),
      image_reference TEXT NOT NULL,
      accent_color TEXT NOT NULL,
      planned_monthly_saving INTEGER CHECK (planned_monthly_saving IS NULL OR planned_monthly_saving > 0),
      status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_transactions (
      id TEXT PRIMARY KEY NOT NULL,
      dream_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (dream_id) REFERENCES dreams(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_dreams_status ON dreams(status);
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_dream_id ON savings_transactions(dream_id);
    CREATE INDEX IF NOT EXISTS idx_savings_transactions_dream_created
      ON savings_transactions(dream_id, created_at DESC);
  `);
}
