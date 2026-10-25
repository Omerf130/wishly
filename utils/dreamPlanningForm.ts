import { ilsToAgorot } from '@/database/money';
import { isValidCalendarDateYmd, parseLocalDateYmd } from '@/utils/localCalendarDate';
import { parseShekelsInput } from '@/utils/parseShekelsInput';

export type DreamPlanningFormValues = {
  monthlySavingsAgorot: number | null;
  targetDateYmd: string | null;
};

export type DreamPlanningFormErrors = {
  monthly?: string;
  targetDate?: string;
};

export function parseOptionalMonthlySavingsShekels(raw: string): {
  agorot: number | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { agorot: null };
  }
  const parsed = parseShekelsInput(trimmed);
  if (parsed === null || parsed <= 0) {
    return { agorot: null, error: 'סכום חודשי חייב להיות גדול מאפס' };
  }
  return { agorot: ilsToAgorot(parsed) };
}

export function parseOptionalTargetDateInput(raw: string): {
  ymd: string | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ymd: null };
  }
  const parts = parseLocalDateYmd(trimmed);
  if (!parts || !isValidCalendarDateYmd(trimmed)) {
    return { ymd: null, error: 'תאריך יעד לא תקין' };
  }
  return { ymd: trimmed };
}

export function validateDreamPlanningForm(
  monthlyShekels: string,
  targetDateInput: string,
): DreamPlanningFormErrors {
  const errors: DreamPlanningFormErrors = {};
  const monthly = parseOptionalMonthlySavingsShekels(monthlyShekels);
  if (monthly.error) {
    errors.monthly = monthly.error;
  }
  const targetDate = parseOptionalTargetDateInput(targetDateInput);
  if (targetDate.error) {
    errors.targetDate = targetDate.error;
  }
  return errors;
}

export function dreamPlanningFormValues(
  monthlyShekels: string,
  targetDateInput: string,
): DreamPlanningFormValues {
  const monthly = parseOptionalMonthlySavingsShekels(monthlyShekels);
  const targetDate = parseOptionalTargetDateInput(targetDateInput);
  return {
    monthlySavingsAgorot: monthly.error ? null : monthly.agorot,
    targetDateYmd: targetDate.error ? null : targetDate.ymd,
  };
}
