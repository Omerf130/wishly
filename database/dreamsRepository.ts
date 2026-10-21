import type { SQLiteDatabase } from 'expo-sqlite';

import { nowIso } from '@/database/dates';
import { DatabaseError, NotFoundError } from '@/database/errors';
import { generateId } from '@/database/ids';
import { mapDreamRow } from '@/database/mappers';
import { validateCreateDreamInput, validateUpdateDreamInput } from '@/database/validation';
import { runInExclusiveTransaction } from '@/database/foreignKeys';
import { addDepositInternal } from '@/database/transactionsRepository';
import type { CreateDreamInput, DreamRecord, UpdateDreamInput } from '@/types/database';

const OPENING_BALANCE_NOTE = 'יתרת פתיחה';

export async function createDream(
  db: SQLiteDatabase,
  input: CreateDreamInput,
): Promise<DreamRecord> {
  validateCreateDreamInput(input);

  const id = generateId();
  const timestamp = nowIso();

  await runInExclusiveTransaction(db, async (txn) => {
    await txn.runAsync(
      `INSERT INTO dreams (
        id, title, description, target_amount, image_type, image_reference,
        accent_color, planned_monthly_saving, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      id,
      input.title.trim(),
      input.description?.trim() ?? null,
      input.targetAmountAgorot,
      input.imageType,
      input.imageReference.trim(),
      input.accentColor.trim(),
      input.plannedMonthlySavingAgorot ?? null,
      timestamp,
      timestamp,
    );

    if (input.initialSavedAmountAgorot && input.initialSavedAmountAgorot > 0) {
      await addDepositInternal(txn, {
        dreamId: id,
        amountAgorot: input.initialSavedAmountAgorot,
        note: OPENING_BALANCE_NOTE,
      });
    }
  });

  const created = await getDreamById(db, id);
  if (!created) {
    throw new NotFoundError('יצירת החלום נכשלה');
  }
  return created;
}

export async function getDreamById(
  db: SQLiteDatabase,
  id: string,
): Promise<DreamRecord | null> {
  const row = await db.getFirstAsync<Parameters<typeof mapDreamRow>[0]>(
    'SELECT * FROM dreams WHERE id = ?',
    id,
  );
  return row ? mapDreamRow(row) : null;
}

export async function listDreams(db: SQLiteDatabase): Promise<DreamRecord[]> {
  const rows = await db.getAllAsync<Parameters<typeof mapDreamRow>[0]>(
    'SELECT * FROM dreams ORDER BY datetime(created_at) DESC',
  );
  return rows.map(mapDreamRow);
}

export async function updateDream(
  db: SQLiteDatabase,
  id: string,
  input: UpdateDreamInput,
): Promise<DreamRecord> {
  validateUpdateDreamInput(input);
  const existing = await getDreamById(db, id);
  if (!existing) {
    throw new NotFoundError('החלום לא נמצא');
  }

  const next = {
    title: input.title?.trim() ?? existing.title,
    description:
      input.description !== undefined ? input.description?.trim() ?? null : existing.description,
    targetAmountAgorot: input.targetAmountAgorot ?? existing.targetAmount,
    imageType: input.imageType ?? existing.imageType,
    imageReference: input.imageReference?.trim() ?? existing.imageReference,
    accentColor: input.accentColor?.trim() ?? existing.accentColor,
    plannedMonthlySavingAgorot:
      input.plannedMonthlySavingAgorot !== undefined
        ? input.plannedMonthlySavingAgorot
        : existing.plannedMonthlySaving,
    status: input.status ?? existing.status,
  };

  await db.runAsync(
    `UPDATE dreams SET
      title = ?,
      description = ?,
      target_amount = ?,
      image_type = ?,
      image_reference = ?,
      accent_color = ?,
      planned_monthly_saving = ?,
      status = ?,
      updated_at = ?
    WHERE id = ?`,
    next.title,
    next.description,
    next.targetAmountAgorot,
    next.imageType,
    next.imageReference,
    next.accentColor,
    next.plannedMonthlySavingAgorot,
    next.status,
    nowIso(),
    id,
  );

  const updated = await getDreamById(db, id);
  if (!updated) {
    throw new NotFoundError('עדכון החלום נכשל');
  }
  return updated;
}

export async function archiveDream(db: SQLiteDatabase, id: string): Promise<DreamRecord> {
  return updateDream(db, id, { status: 'archived' });
}

export async function deleteDream(db: SQLiteDatabase, id: string): Promise<void> {
  const existing = await getDreamById(db, id);
  if (!existing) {
    throw new NotFoundError('החלום לא נמצא');
  }

  await runInExclusiveTransaction(db, async (txn) => {
    await txn.runAsync('DELETE FROM dreams WHERE id = ?', id);

    const dreamLeft = await txn.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM dreams WHERE id = ?',
      id,
    );
    const txsLeft = await txn.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM savings_transactions WHERE dream_id = ?',
      id,
    );

    if ((dreamLeft?.count ?? 0) > 0) {
      throw new DatabaseError('מחיקת החלום לא הושלמה');
    }
    if ((txsLeft?.count ?? 0) > 0) {
      throw new DatabaseError(
        `ON DELETE CASCADE השאיר ${txsLeft?.count} פעולות חיסכון לחלום שנמחק`,
      );
    }
  });
}
