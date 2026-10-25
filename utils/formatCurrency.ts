const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

export function formatIls(amount: number): string {
  return ilsFormatter.format(amount);
}

const ilsExactFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatIlsExact(amount: number): string {
  return ilsExactFormatter.format(amount);
}

export function dreamProgressPercent(saved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((saved / target) * 100));
}

export function dreamProgressPercentFromAgorot(
  savedAgorot: number,
  targetAgorot: number,
): number {
  if (targetAgorot <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((savedAgorot / targetAgorot) * 100));
}

export function isDreamSavingsGoalReached(saved: number, target: number): boolean {
  if (target <= 0) {
    return false;
  }
  return saved >= target;
}
