import { ilsToAgorot } from '@/database/money';
import type { Dream } from '@/types/dream';

export type HomeSavingsOverview = {
  totalSavedAgorot: number;
  totalTargetAgorot: number;
  dreamCount: number;
  reachedCount: number;
  /** Weighted money ratio, capped at 100 for display. */
  overallProgressPercent: number;
};

export function computeHomeSavingsOverview(dreams: Dream[]): HomeSavingsOverview {
  let totalSavedAgorot = 0;
  let totalTargetAgorot = 0;
  let reachedCount = 0;

  for (const dream of dreams) {
    const savedAgorot = ilsToAgorot(dream.savedAmount);
    const targetAgorot = ilsToAgorot(dream.targetAmount);
    totalSavedAgorot += savedAgorot;
    totalTargetAgorot += targetAgorot;
    if (targetAgorot > 0 && savedAgorot >= targetAgorot) {
      reachedCount += 1;
    }
  }

  const dreamCount = dreams.length;
  let overallProgressPercent = 0;
  if (dreamCount > 0 && totalTargetAgorot > 0) {
    overallProgressPercent = Math.min(
      100,
      Math.round((totalSavedAgorot / totalTargetAgorot) * 100),
    );
  }

  return {
    totalSavedAgorot,
    totalTargetAgorot,
    dreamCount,
    reachedCount,
    overallProgressPercent,
  };
}
