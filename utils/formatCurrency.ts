const ilsFormatter = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  maximumFractionDigits: 0,
});

export function formatIls(amount: number): string {
  return ilsFormatter.format(amount);
}

export function dreamProgressPercent(saved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((saved / target) * 100));
}
