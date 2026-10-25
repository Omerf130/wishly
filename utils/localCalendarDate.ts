export type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

const YMD_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayLocalYmd(referenceDate: Date = new Date()): string {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const day = referenceDate.getDate();
  return formatYmdParts({ year, month, day });
}

export function formatYmdParts(parts: LocalDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/** Local calendar Date at noon — avoids timezone day shifts in pickers. */
export function localDateFromYmd(ymd: string): Date | null {
  const parts = parseLocalDateYmd(ymd);
  if (!parts) {
    return null;
  }
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
}

export function localYmdFromDate(date: Date): string {
  return formatYmdParts({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

export function startOfTodayLocal(referenceDate: Date = new Date()): Date {
  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
    0,
  );
}

export function parseLocalDateYmd(value: string): LocalDateParts | null {
  const trimmed = value.trim();
  const match = YMD_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidCalendarDateParts({ year, month, day })) {
    return null;
  }

  return { year, month, day };
}

export function isValidCalendarDateYmd(value: string): boolean {
  return parseLocalDateYmd(value) !== null;
}

export function isValidCalendarDateParts(parts: LocalDateParts): boolean {
  if (!Number.isInteger(parts.year) || parts.year < 1 || parts.year > 9999) {
    return false;
  }
  if (!Number.isInteger(parts.month) || parts.month < 1 || parts.month > 12) {
    return false;
  }
  if (!Number.isInteger(parts.day) || parts.day < 1 || parts.day > 31) {
    return false;
  }

  const daysInMonth = new Date(parts.year, parts.month, 0).getDate();
  return parts.day <= daysInMonth;
}

/** -1 if a before b, 0 if equal, 1 if a after b (calendar order). */
export function compareLocalDateYmd(aYmd: string, bYmd: string): number {
  const a = parseLocalDateYmd(aYmd);
  const b = parseLocalDateYmd(bYmd);
  if (!a || !b) {
    throw new Error('compareLocalDateYmd requires valid YYYY-MM-DD values');
  }
  if (a.year !== b.year) {
    return a.year < b.year ? -1 : 1;
  }
  if (a.month !== b.month) {
    return a.month < b.month ? -1 : 1;
  }
  if (a.day !== b.day) {
    return a.day < b.day ? -1 : 1;
  }
  return 0;
}

/**
 * Inclusive calendar months from `fromYmd` through `toYmd` (month buckets).
 * Example: 2026-03-15 → 2026-05-01 returns 3 (March, April, May).
 */
export function inclusiveCalendarMonthsBetween(fromYmd: string, toYmd: string): number {
  const from = parseLocalDateYmd(fromYmd);
  const to = parseLocalDateYmd(toYmd);
  if (!from || !to) {
    return 0;
  }
  if (compareLocalDateYmd(fromYmd, toYmd) > 0) {
    return 0;
  }
  return (to.year - from.year) * 12 + (to.month - from.month) + 1;
}

const HEBREW_MONTH_NAMES = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const;

/** e.g. "12 בדצמבר 2027" — local calendar, no timezone shift. */
export function formatLocalDateYmdHebrew(ymd: string): string {
  const parts = parseLocalDateYmd(ymd);
  if (!parts) {
    return ymd;
  }
  const monthName = HEBREW_MONTH_NAMES[parts.month - 1] ?? String(parts.month);
  return `${parts.day} ב${monthName} ${parts.year}`;
}
