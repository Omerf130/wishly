import {
  compareLocalDateYmd,
  inclusiveCalendarMonthsBetween,
  todayLocalYmd,
} from '@/utils/localCalendarDate';

export type SavingsForecastInput = {
  savedAgorot: number;
  targetAgorot: number;
  monthlySavingsAgorot?: number | null;
  targetDateYmd?: string | null;
  todayYmd?: string;
};

export type SavingsForecastResult = {
  remainingAgorot: number;
  goalReached: boolean;
  estimatedMonthsFromMonthlyPlan: number | null;
  requiredMonthlyAgorotForDate: number | null;
  calendarMonthsUntilTargetDate: number | null;
  targetDatePast: boolean;
  /** null when comparison is not applicable (missing monthly or date). */
  plannedMonthlyMeetsTargetDate: boolean | null;
  /** Set when monthly plan and a future target date allow gap comparison. */
  monthlyPlanGap: MonthlyPlanGap | null;
};

export type MonthlyPlanComparisonStatus = 'insufficient' | 'exact' | 'above';

export type MonthlyPlanGap = {
  plannedMonthlyAgorot: number;
  requiredMonthlyAgorot: number;
  additionalMonthlyAgorot: number;
  comparisonStatus: MonthlyPlanComparisonStatus;
  /** True only when planned exceeds required by at least one full calendar month in estimate. */
  suggestsEarlierArrival: boolean;
};

export function classifyMonthlyPlanComparison(
  plannedMonthlyAgorot: number,
  requiredMonthlyAgorot: number,
): MonthlyPlanComparisonStatus {
  const planned = Math.trunc(plannedMonthlyAgorot);
  const required = Math.trunc(requiredMonthlyAgorot);
  if (planned < required) {
    return 'insufficient';
  }
  if (planned === required) {
    return 'exact';
  }
  return 'above';
}

export function planSuggestsFullMonthEarlierArrival(
  estimatedMonthsFromMonthlyPlan: number | null,
  calendarMonthsUntilTargetDate: number | null,
): boolean {
  if (estimatedMonthsFromMonthlyPlan === null || calendarMonthsUntilTargetDate === null) {
    return false;
  }
  return calendarMonthsUntilTargetDate - estimatedMonthsFromMonthlyPlan >= 1;
}

export function computeAdditionalMonthlyAgorot(
  requiredMonthlyAgorot: number,
  plannedMonthlyAgorot: number,
): number {
  const required = Math.trunc(requiredMonthlyAgorot);
  const planned = Math.trunc(plannedMonthlyAgorot);
  return Math.max(0, required - planned);
}

export function computeMonthlyPlanGap(params: {
  plannedMonthlyAgorot: number;
  remainingAgorot: number;
  targetDateYmd: string;
  todayYmd: string;
  goalReached: boolean;
  targetDatePast: boolean;
  estimatedMonthsFromMonthlyPlan?: number | null;
  calendarMonthsUntilTargetDate?: number | null;
}): MonthlyPlanGap | null {
  if (params.goalReached || params.targetDatePast) {
    return null;
  }
  if (!Number.isInteger(params.plannedMonthlyAgorot) || params.plannedMonthlyAgorot <= 0) {
    return null;
  }

  const required = requiredMonthlyAgorotForTargetDate(
    params.remainingAgorot,
    params.todayYmd,
    params.targetDateYmd,
  );
  if (required === null) {
    return null;
  }

  const comparisonStatus = classifyMonthlyPlanComparison(
    params.plannedMonthlyAgorot,
    required,
  );
  const suggestsEarlierArrival =
    comparisonStatus === 'above'
      ? planSuggestsFullMonthEarlierArrival(
          params.estimatedMonthsFromMonthlyPlan ?? null,
          params.calendarMonthsUntilTargetDate ?? null,
        )
      : false;

  return {
    plannedMonthlyAgorot: params.plannedMonthlyAgorot,
    requiredMonthlyAgorot: required,
    additionalMonthlyAgorot: computeAdditionalMonthlyAgorot(required, params.plannedMonthlyAgorot),
    comparisonStatus,
    suggestsEarlierArrival,
  };
}

export function remainingToSaveAgorot(savedAgorot: number, targetAgorot: number): number {
  if (!Number.isFinite(savedAgorot) || !Number.isFinite(targetAgorot)) {
    return 0;
  }
  return Math.max(0, Math.trunc(targetAgorot) - Math.trunc(savedAgorot));
}

export function estimateMonthsFromMonthlyPlan(
  remainingAgorot: number,
  monthlySavingsAgorot: number,
): number | null {
  if (remainingAgorot <= 0) {
    return 0;
  }
  if (!Number.isInteger(monthlySavingsAgorot) || monthlySavingsAgorot <= 0) {
    return null;
  }
  return Math.ceil(remainingAgorot / monthlySavingsAgorot);
}

export function monthsUntilTargetDateInclusive(fromYmd: string, targetDateYmd: string): number {
  return inclusiveCalendarMonthsBetween(fromYmd, targetDateYmd);
}

export function requiredMonthlyAgorotForTargetDate(
  remainingAgorot: number,
  fromYmd: string,
  targetDateYmd: string,
): number | null {
  if (remainingAgorot <= 0) {
    return 0;
  }
  if (compareLocalDateYmd(targetDateYmd, fromYmd) < 0) {
    return null;
  }

  const months = monthsUntilTargetDateInclusive(fromYmd, targetDateYmd);
  if (months <= 0) {
    return null;
  }

  return Math.ceil(remainingAgorot / months);
}

export function isPlannedMonthlySufficientForTargetDate(
  monthlySavingsAgorot: number,
  remainingAgorot: number,
  fromYmd: string,
  targetDateYmd: string,
): boolean | null {
  const required = requiredMonthlyAgorotForTargetDate(
    remainingAgorot,
    fromYmd,
    targetDateYmd,
  );
  if (required === null) {
    return null;
  }
  if (!Number.isInteger(monthlySavingsAgorot) || monthlySavingsAgorot <= 0) {
    return null;
  }
  return monthlySavingsAgorot >= required;
}

export function buildSavingsForecast(input: SavingsForecastInput): SavingsForecastResult {
  const todayYmd = input.todayYmd ?? todayLocalYmd();
  const remainingAgorot = remainingToSaveAgorot(input.savedAgorot, input.targetAgorot);
  const goalReached = remainingAgorot <= 0;

  const monthly = input.monthlySavingsAgorot ?? null;
  const targetDateYmd = input.targetDateYmd ?? null;

  const estimatedMonthsFromMonthlyPlan =
    monthly != null && monthly > 0
      ? estimateMonthsFromMonthlyPlan(remainingAgorot, monthly)
      : null;

  let targetDatePast = false;
  let calendarMonthsUntilTargetDate: number | null = null;
  let requiredMonthlyAgorotForDate: number | null = null;
  let plannedMonthlyMeetsTargetDate: boolean | null = null;
  let monthlyPlanGap: MonthlyPlanGap | null = null;

  if (targetDateYmd) {
    targetDatePast = compareLocalDateYmd(targetDateYmd, todayYmd) < 0;
    calendarMonthsUntilTargetDate = monthsUntilTargetDateInclusive(todayYmd, targetDateYmd);
    requiredMonthlyAgorotForDate = requiredMonthlyAgorotForTargetDate(
      remainingAgorot,
      todayYmd,
      targetDateYmd,
    );
    if (monthly != null && monthly > 0) {
      plannedMonthlyMeetsTargetDate = isPlannedMonthlySufficientForTargetDate(
        monthly,
        remainingAgorot,
        todayYmd,
        targetDateYmd,
      );
      monthlyPlanGap = computeMonthlyPlanGap({
        plannedMonthlyAgorot: monthly,
        remainingAgorot,
        targetDateYmd,
        todayYmd,
        goalReached,
        targetDatePast,
        estimatedMonthsFromMonthlyPlan,
        calendarMonthsUntilTargetDate,
      });
    }
  }

  return {
    remainingAgorot,
    goalReached,
    estimatedMonthsFromMonthlyPlan,
    requiredMonthlyAgorotForDate,
    calendarMonthsUntilTargetDate,
    targetDatePast,
    plannedMonthlyMeetsTargetDate,
    monthlyPlanGap,
  };
}

export type MonthlyPlanComparisonCopy = {
  statusMessage: string;
  tone: 'warn' | 'success';
  showGapRecommendation: boolean;
  showEstimatedMonthsFromPlan: boolean;
};

export function getMonthlyPlanComparisonCopy(gap: MonthlyPlanGap): MonthlyPlanComparisonCopy {
  if (gap.comparisonStatus === 'insufficient') {
    return {
      statusMessage: 'התכנון הנוכחי לא מספיק כדי להגיע לתאריך שבחרת.',
      tone: 'warn',
      showGapRecommendation: true,
      showEstimatedMonthsFromPlan: false,
    };
  }
  if (gap.comparisonStatus === 'exact') {
    return {
      statusMessage: 'מצוין! התכנון שלך מתאים לתאריך היעד.',
      tone: 'success',
      showGapRecommendation: false,
      showEstimatedMonthsFromPlan: false,
    };
  }
  if (gap.suggestsEarlierArrival) {
    return {
      statusMessage: 'מעולה! לפי התכנון שלך, ייתכן שתגיע ליעד מוקדם מהתאריך שבחרת.',
      tone: 'success',
      showGapRecommendation: false,
      showEstimatedMonthsFromPlan: true,
    };
  }
  return {
    statusMessage: 'מצוין! התכנון שלך מתאים ליעד עם מרווח ביטחון.',
    tone: 'success',
    showGapRecommendation: false,
    showEstimatedMonthsFromPlan: true,
  };
}

export function formatEstimatedMonthsHebrew(months: number | null): string {
  if (months === null) {
    return '—';
  }
  if (months <= 0) {
    return 'ביעד';
  }
  if (months === 1) {
    return 'כחודש אחד';
  }
  return `כ-${months} חודשים`;
}
