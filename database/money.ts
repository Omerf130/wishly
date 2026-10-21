import { ValidationError } from '@/database/errors';

/** Convert whole ILS units to agorot (integer). */
export function ilsToAgorot(ils: number): number {
  if (!Number.isFinite(ils)) {
    throw new ValidationError('סכום לא תקין');
  }
  return Math.round(ils * 100);
}

/** Convert agorot to whole ILS for display (not for persistence). */
export function agorotToIls(agorot: number): number {
  return agorot / 100;
}

export function assertPositiveAgorot(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError(`${label} חייב להיות מספר שלם חיובי באגורות`);
  }
}
