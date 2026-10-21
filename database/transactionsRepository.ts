import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/database/dates';
import { InsufficientBalanceError, NotFoundError } from '@/database/errors';
import { generateId } from '@/database/ids';
import { mapTransactionRow } from '@/database/mappers';
import {
  assertNonNegativeBalance,
  assertSufficientBalance,
  validateCreateTransactionInput,
  validateUpdateTransactionInput,
} from '@/database/validation';
import { runInExclusiveTransaction } from '@/database/foreignKeys';
import type {
  CreateTransactionInput,
  SavingsTransactionRecord,
  UpdateTransactionInput,
} from '@/types/database';

type TxnDb = Pick<
  SQLiteDatabase,
  'getFirstAsync' | 'runAsync' | 'getAllAsync' | 'withExclusiveTransactionAsync'
>;

async function assertDreamExists(db: TxnDb, dreamId: string): Promise<void> {
  const row = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM dreams WHERE id = ?',
    dreamId,
  );
  if (!row) {
    throw new NotFoundError('החלום לא נמצא');
  }
}

export async function getSavedAmountForDream(
  db: SQLiteDatabase,
  dreamId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ balance: number | null }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS balance
    FROM savings_transactions
    WHERE dream_id = ?`,
    dreamId,
  );
  const balance = row?.balance ?? 0;
  assertNonNegativeBalance(balance);
  return balance;
}

async function getSavedAmountExcludingTransaction(
  db: TxnDb,
  dreamId: string,
  excludeTransactionId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ balance: number | null }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0) -
      COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0) AS balance
    FROM savings_transactions
    WHERE dream_id = ? AND id != ?`,
    dreamId,
    excludeTransactionId,
  );
  const balance = row?.balance ?? 0;
  assertNonNegativeBalance(balance);
  return balance;
}

export async function addDepositInternal(
  txn: TxnDb,
  input: { dreamId: string; amountAgorot: number; note?: string | null },
): Promise<SavingsTransactionRecord> {
  const id = generateId();
  const timestamp = nowIso();

  await txn.runAsync(
    `INSERT INTO savings_transactions (
      id, dream_id, type, amount, note, created_at, updated_at
    ) VALUES (?, ?, 'deposit', ?, ?, ?, ?)`,
    id,
    input.dreamId,
    input.amountAgorot,
    input.note?.trim() ?? null,
    timestamp,
    timestamp,
  );

  const row = await txn.getFirstAsync<Parameters<typeof mapTransactionRow>[0]>(
    'SELECT * FROM savings_transactions WHERE id = ?',
    id,
  );
  if (!row) {
    throw new NotFoundError('יצירת ההפקדה נכשלה');
  }
  return mapTransactionRow(row);
}

export async function addDeposit(
  db: SQLiteDatabase,
  input: CreateTransactionInput,
): Promise<SavingsTransactionRecord> {
  validateCreateTransactionInput(input);
  await assertDreamExists(db, input.dreamId);

  let created: SavingsTransactionRecord | null = null;
  await runInExclusiveTransaction(db, async (txn) => {
    created = await addDepositInternal(txn, input);
  });
  return created!;
}

export async function addWithdrawal(
  db: SQLiteDatabase,
  input: CreateTransactionInput,
): Promise<SavingsTransactionRecord> {
  validateCreateTransactionInput(input);
  await assertDreamExists(db, input.dreamId);

  let created: SavingsTransactionRecord | null = null;
  await runInExclusiveTransaction(db, async (txn) => {
    const balance = await getSavedAmountForDream(txn as SQLiteDatabase, input.dreamId);
    assertSufficientBalance(balance, input.amountAgorot);

    const id = generateId();
    const timestamp = nowIso();
    await txn.runAsync(
      `INSERT INTO savings_transactions (
        id, dream_id, type, amount, note, created_at, updated_at
      ) VALUES (?, ?, 'withdrawal', ?, ?, ?, ?)`,
      id,
      input.dreamId,
      input.amountAgorot,
      input.note?.trim() ?? null,
      timestamp,
      timestamp,
    );

    const row = await txn.getFirstAsync<Parameters<typeof mapTransactionRow>[0]>(
      'SELECT * FROM savings_transactions WHERE id = ?',
      id,
    );
    if (!row) {
      throw new NotFoundError('יצירת המשיכה נכשלה');
    }
    created = mapTransactionRow(row);
  });

  return created!;
}

export async function listTransactionsByDream(
  db: SQLiteDatabase,
  dreamId: string,
): Promise<SavingsTransactionRecord[]> {
  await assertDreamExists(db, dreamId);

  const rows = await db.getAllAsync<Parameters<typeof mapTransactionRow>[0]>(
    `SELECT * FROM savings_transactions
     WHERE dream_id = ?
     ORDER BY datetime(created_at) DESC, id DESC`,
    dreamId,
  );
  return rows.map(mapTransactionRow);
}

export async function updateTransaction(
  db: SQLiteDatabase,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<SavingsTransactionRecord> {
  validateUpdateTransactionInput(input);

  const existing = await db.getFirstAsync<Parameters<typeof mapTransactionRow>[0]>(
    'SELECT * FROM savings_transactions WHERE id = ?',
    transactionId,
  );
  if (!existing) {
    throw new NotFoundError('הפעולה לא נמצאה');
  }

  const nextAmount = input.amountAgorot ?? existing.amount;
  const nextNote =
    input.note !== undefined ? input.note?.trim() ?? null : existing.note;

  await runInExclusiveTransaction(db, async (txn) => {
    const balanceWithoutTx = await getSavedAmountExcludingTransaction(
      txn,
      existing.dream_id,
      transactionId,
    );

    const projected =
      existing.type === 'deposit'
        ? balanceWithoutTx + nextAmount
        : balanceWithoutTx - nextAmount;

    assertNonNegativeBalance(projected);
    if (projected < 0) {
      throw new InsufficientBalanceError('לא ניתן לעדכן את הפעולה — יתרה שלילית');
    }

    await txn.runAsync(
      `UPDATE savings_transactions
       SET amount = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      nextAmount,
      nextNote,
      nowIso(),
      transactionId,
    );
  });

  const updated = await db.getFirstAsync<Parameters<typeof mapTransactionRow>[0]>(
    'SELECT * FROM savings_transactions WHERE id = ?',
    transactionId,
  );
  if (!updated) {
    throw new NotFoundError('עדכון הפעולה נכשל');
  }
  return mapTransactionRow(updated);
}

export async function deleteTransaction(
  db: SQLiteDatabase,
  transactionId: string,
): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM savings_transactions WHERE id = ?',
    transactionId,
  );
  if (!existing) {
    throw new NotFoundError('הפעולה לא נמצאה');
  }

  await db.runAsync('DELETE FROM savings_transactions WHERE id = ?', transactionId);
}
