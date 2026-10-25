import type { DreamImageType, DreamStatus, SavingsTransactionType } from '@/types/database';
import { isValidCalendarDateYmd } from '@/utils/localCalendarDate';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { BACKUP_IMPORT_LIMITS } from '@/utils/wishlyBackup/importLimits';
import { assertSafeLocalDreamImageReference } from '@/utils/wishlyBackup/pathSecurity';
import type { WishlyBackupDataJson } from '@/utils/wishlyBackup/types';

const DREAM_STATUSES: DreamStatus[] = ['active', 'completed', 'archived'];
const IMAGE_TYPES: DreamImageType[] = ['builtIn', 'local'];
const TX_TYPES: SavingsTransactionType[] = ['deposit', 'withdrawal'];

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BUILT_IN_IMAGE_KEYS = new Set(['car', 'vacation', 'computer', 'house']);

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BackupImportError(`${label} אינו בפורמט תקין`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return value;
}

function assertIsoTimestamp(value: unknown, label: string): string {
  const text = assertString(value, label);
  if (Number.isNaN(Date.parse(text))) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return text;
}

function assertPositiveIntAgorot(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new BackupImportError(`${label} חייב להיות מספר שלם חיובי באגורות`);
  }
  return value;
}

function assertOptionalPositiveIntAgorot(value: unknown, label: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return assertPositiveIntAgorot(value, label);
}

function assertOptionalYmd(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const text = assertString(value, 'תאריך יעד');
  if (!isValidCalendarDateYmd(text)) {
    throw new BackupImportError('תאריך יעד בפורמט לא תקין');
  }
  return text;
}

function assertUuid(value: unknown, label: string): string {
  const text = assertString(value, label);
  if (!UUID_LIKE.test(text)) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return text;
}

export function parseBackupDataJsonBytes(dataBytes: Uint8Array): WishlyBackupDataJson {
  if (dataBytes.byteLength > BACKUP_IMPORT_LIMITS.maxDataJsonBytes) {
    throw new BackupImportError('קובץ data.json גדול מדי');
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(dataBytes);
    parsed = JSON.parse(text);
  } catch {
    throw new BackupImportError('קובץ data.json אינו JSON תקין');
  }

  const root = assertObject(parsed, 'data.json');
  if (!Array.isArray(root.dreams)) {
    throw new BackupImportError('רשימת החלומות בגיבוי אינה תקינה');
  }
  if (!Array.isArray(root.savingsTransactions)) {
    throw new BackupImportError('רשימת הפעולות בגיבוי אינה תקינה');
  }

  if (root.dreams.length > BACKUP_IMPORT_LIMITS.maxDreams) {
    throw new BackupImportError('מספר החלומות בגיבוי חורג מהמגבלה');
  }
  if (root.savingsTransactions.length > BACKUP_IMPORT_LIMITS.maxTransactions) {
    throw new BackupImportError('מספר הפעולות בגיבוי חורג מהמגבלה');
  }

  const dreams = root.dreams.map((row, index) => validateDreamRow(row, index));
  const savingsTransactions = root.savingsTransactions.map((row, index) =>
    validateTransactionRow(row, index),
  );

  const dreamIds = new Set<string>();
  for (const dream of dreams) {
    if (dreamIds.has(dream.id)) {
      throw new BackupImportError('קובץ הגיבוי מכיל מזהי חלומות כפולים');
    }
    dreamIds.add(dream.id);
  }

  const txIds = new Set<string>();
  for (const tx of savingsTransactions) {
    if (txIds.has(tx.id)) {
      throw new BackupImportError('קובץ הגיבוי מכיל מזהי פעולות כפולים');
    }
    txIds.add(tx.id);
    if (!dreamIds.has(tx.dreamId)) {
      throw new BackupImportError('קובץ הגיבוי מכיל פעולות שאינן מקושרות לחלום');
    }
  }

  return { dreams, savingsTransactions };
}

function validateDreamRow(row: unknown, index: number): WishlyBackupDataJson['dreams'][number] {
  const obj = assertObject(row, `חלום ${index + 1}`);
  const imageType = assertString(obj.imageType, `סוג תמונה (${index + 1})`) as DreamImageType;
  if (!IMAGE_TYPES.includes(imageType)) {
    throw new BackupImportError(`סוג תמונה לא תקין (${index + 1})`);
  }

  const imageReference = assertString(obj.imageReference, `תמונה (${index + 1})`);
  if (imageType === 'builtIn') {
    if (!BUILT_IN_IMAGE_KEYS.has(imageReference)) {
      throw new BackupImportError(`תמונת מובנה לא מוכרת (${index + 1})`);
    }
  } else {
    try {
      assertSafeLocalDreamImageReference(imageReference);
    } catch {
      throw new BackupImportError(`נתיב תמונה אישית לא תקין (${index + 1})`);
    }
  }

  const status = assertString(obj.status, `סטטוס (${index + 1})`) as DreamStatus;
  if (!DREAM_STATUSES.includes(status)) {
    throw new BackupImportError(`סטטוס חלום לא תקין (${index + 1})`);
  }

  return {
    id: assertUuid(obj.id, `מזהה חלום (${index + 1})`),
    title: assertString(obj.title, `שם חלום (${index + 1})`),
    description:
      obj.description === null || obj.description === undefined
        ? null
        : assertString(obj.description, `תיאור (${index + 1})`),
    targetAmount: assertPositiveIntAgorot(obj.targetAmount, `סכום יעד (${index + 1})`),
    imageType,
    imageReference,
    accentColor: assertString(obj.accentColor, `צבע (${index + 1})`),
    monthlySavingsAgorot: assertOptionalPositiveIntAgorot(
      obj.monthlySavingsAgorot,
      `חיסכון חודשי (${index + 1})`,
    ),
    targetDate: assertOptionalYmd(obj.targetDate),
    status,
    createdAt: assertIsoTimestamp(obj.createdAt, `תאריך יצירה (${index + 1})`),
    updatedAt: assertIsoTimestamp(obj.updatedAt, `תאריך עדכון (${index + 1})`),
  };
}

function validateTransactionRow(
  row: unknown,
  index: number,
): WishlyBackupDataJson['savingsTransactions'][number] {
  const obj = assertObject(row, `פעולה ${index + 1}`);
  const type = assertString(obj.type, `סוג פעולה (${index + 1})`) as SavingsTransactionType;
  if (!TX_TYPES.includes(type)) {
    throw new BackupImportError(`סוג פעולה לא תקין (${index + 1})`);
  }

  return {
    id: assertUuid(obj.id, `מזהה פעולה (${index + 1})`),
    dreamId: assertUuid(obj.dreamId, `חלום לפעולה (${index + 1})`),
    type,
    amount: assertPositiveIntAgorot(obj.amount, `סכום פעולה (${index + 1})`),
    note:
      obj.note === null || obj.note === undefined
        ? null
        : assertString(obj.note, `הערה (${index + 1})`),
    createdAt: assertIsoTimestamp(obj.createdAt, `תאריך פעולה (${index + 1})`),
    updatedAt: assertIsoTimestamp(obj.updatedAt, `תאריך עדכון פעולה (${index + 1})`),
  };
}
