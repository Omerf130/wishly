export type PendingGoalCelebration = {
  dreamId: string;
  progressBeforePercent: number;
};

let pending: PendingGoalCelebration | null = null;

/** Marks a goal reached via successful deposit (crossed below 100% to >= 100%). */
export function markPendingGoalCelebration(
  dreamId: string,
  progressBeforePercent: number,
): void {
  pending = { dreamId, progressBeforePercent };
}

export function consumePendingGoalCelebration(
  dreamId: string,
): PendingGoalCelebration | null {
  if (pending?.dreamId !== dreamId) {
    return null;
  }
  const value = pending;
  pending = null;
  return value;
}
