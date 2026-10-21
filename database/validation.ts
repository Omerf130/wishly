import { ValidationError } from '@/database/errors';
import { assertPositiveAgorot } from '@/database/money';
import type {
  CreateDreamInput,
  CreateTransactionInput,
  DreamImageType,
  DreamStatus,
  UpdateDreamInput,
  UpdateTransactionInput,
} from '@/types/database';

const DREAM_STATUSES: DreamStatus[] = ['active', 'completed', 'archived'];
const IMAGE_TYPES: DreamImageType[] = ['builtIn', 'local'];

export function validateCreateDreamInput(input: CreateDreamInput): void {
  if (!input.title.trim()) {
    throw new ValidationError('שם החלום חובה');
  }
  assertPositiveAgorot(input.targetAmountAgorot, 'סכום יעד');
  if (!IMAGE_TYPES.includes(input.imageType)) {
    throw new ValidationError('סוג תמונה לא תקין');
  }
  if (!input.imageReference.trim()) {
    throw new ValidationError('הפניה לתמונה חובה');
  }
  if (!input.accentColor.trim()) {
    throw new ValidationError('צבע accent חובה');
  }
  if (
    input.plannedMonthlySavingAgorot != null &&
    input.plannedMonthlySavingAgorot !== undefined
  ) {
    assertPositiveAgorot(input.plannedMonthlySavingAgorot, 'חיסכון חודשי מתוכנן');
  }
  if (input.initialSavedAmountAgorot != null && input.initialSavedAmountAgorot !== undefined) {
    assertPositiveAgorot(input.initialSavedAmountAgorot, 'יתרת פתיחה');
  }
}

export function validateUpdateDreamInput(input: UpdateDreamInput): void {
  if (input.title !== undefined && !input.title.trim()) {
    throw new ValidationError('שם החלום לא יכול להיות ריק');
  }
  if (input.targetAmountAgorot !== undefined) {
    assertPositiveAgorot(input.targetAmountAgorot, 'סכום יעד');
  }
  if (input.imageType !== undefined && !IMAGE_TYPES.includes(input.imageType)) {
    throw new ValidationError('סוג תמונה לא תקין');
  }
  if (input.imageReference !== undefined && !input.imageReference.trim()) {
    throw new ValidationError('הפניה לתמונה לא תקינה');
  }
  if (input.accentColor !== undefined && !input.accentColor.trim()) {
    throw new ValidationError('צבע accent לא תקין');
  }
  if (
    input.plannedMonthlySavingAgorot !== undefined &&
    input.plannedMonthlySavingAgorot !== null
  ) {
    assertPositiveAgorot(input.plannedMonthlySavingAgorot, 'חיסכון חודשי מתוכנן');
  }
  if (input.status !== undefined && !DREAM_STATUSES.includes(input.status)) {
    throw new ValidationError('סטטוס חלום לא תקין');
  }
}

export function validateCreateTransactionInput(input: CreateTransactionInput): void {
  if (!input.dreamId.trim()) {
    throw new ValidationError('מזהה חלום חובה');
  }
  assertPositiveAgorot(input.amountAgorot, 'סכום פעולה');
}

export function validateUpdateTransactionInput(input: UpdateTransactionInput): void {
  if (input.amountAgorot !== undefined) {
    assertPositiveAgorot(input.amountAgorot, 'סכום פעולה');
  }
}

export function assertNonNegativeBalance(balanceAgorot: number): void {
  if (balanceAgorot < 0) {
    throw new ValidationError('יתרה שלילית אינה מותרת');
  }
}

export function assertSufficientBalance(balanceAgorot: number, withdrawalAgorot: number): void {
  if (withdrawalAgorot > balanceAgorot) {
    throw new ValidationError('לא ניתן למשוך יותר מהיתרה הקיימת');
  }
}
