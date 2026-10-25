import { ilsToAgorot } from '@/database/money';
import type { Dream } from '@/types/dream';
import { isDreamSavingsGoalReached } from '@/utils/formatCurrency';
import { todayLocalYmd } from '@/utils/localCalendarDate';
import { buildSavingsForecast, type SavingsForecastResult } from '@/utils/savingsForecast';

export type PlanningActiveDream = {
  dream: Dream;
  forecast: SavingsForecastResult;
  monthlyAgorot: number | null;
  hasMonthlyPlan: boolean;
  hasTargetDatePlan: boolean;
};

export type PlanningScreenModel = {
  monthlySummary: {
    totalPlannedMonthlyAgorot: number;
    activePlansCount: number;
  };
  activePlans: PlanningActiveDream[];
  awaitingPlanning: Dream[];
  goalsReached: Dream[];
};

export function dreamHasPlanningField(dream: Dream): boolean {
  const hasMonthly = dream.monthlySavingsAmount != null && dream.monthlySavingsAmount > 0;
  const hasDate = dream.targetDate != null && dream.targetDate.trim().length > 0;
  return hasMonthly || hasDate;
}

export function buildPlanningScreenModel(
  dreams: Dream[],
  todayYmd: string = todayLocalYmd(),
): PlanningScreenModel {
  const activePlans: PlanningActiveDream[] = [];
  const awaitingPlanning: Dream[] = [];
  const goalsReached: Dream[] = [];

  let totalPlannedMonthlyAgorot = 0;

  for (const dream of dreams) {
    const goalReached = isDreamSavingsGoalReached(dream.savedAmount, dream.targetAmount);

    if (goalReached) {
      goalsReached.push(dream);
      continue;
    }

    if (!dreamHasPlanningField(dream)) {
      awaitingPlanning.push(dream);
      continue;
    }

    const monthlyAgorot =
      dream.monthlySavingsAmount != null && dream.monthlySavingsAmount > 0
        ? ilsToAgorot(dream.monthlySavingsAmount)
        : null;

    if (monthlyAgorot != null) {
      totalPlannedMonthlyAgorot += monthlyAgorot;
    }

    const forecast = buildSavingsForecast({
      savedAgorot: ilsToAgorot(dream.savedAmount),
      targetAgorot: ilsToAgorot(dream.targetAmount),
      monthlySavingsAgorot: monthlyAgorot,
      targetDateYmd: dream.targetDate,
      todayYmd,
    });

    activePlans.push({
      dream,
      forecast,
      monthlyAgorot,
      hasMonthlyPlan: monthlyAgorot != null,
      hasTargetDatePlan: Boolean(dream.targetDate?.trim()),
    });
  }

  return {
    monthlySummary: {
      totalPlannedMonthlyAgorot,
      activePlansCount: activePlans.length,
    },
    activePlans,
    awaitingPlanning,
    goalsReached,
  };
}
