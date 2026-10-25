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

/** Format agorot for shekel text inputs (supports up to 2 decimal places). */
export function agorotToShekelsInputString(agorot: number): string {
  const whole = Math.floor(agorot / 100);
  const cents = agorot % 100;
  if (cents === 0) {
    return String(whole);
  }
  return `${whole}.${String(cents).padStart(2, '0')}`;
}

export function assertPositiveAgorot(amount: number, label: string): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError(`${label} חייב להיות מספר שלם חיובי באגורות`);
  }
}
