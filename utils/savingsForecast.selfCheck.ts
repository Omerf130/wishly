/**
 * Run: npx tsx utils/savingsForecast.selfCheck.ts
 */
import { compareLocalDateYmd, inclusiveCalendarMonthsBetween } from './localCalendarDate';
import {
  buildSavingsForecast,
  classifyMonthlyPlanComparison,
  computeAdditionalMonthlyAgorot,
  computeMonthlyPlanGap,
  estimateMonthsFromMonthlyPlan,
  isPlannedMonthlySufficientForTargetDate,
  planSuggestsFullMonthEarlierArrival,
  remainingToSaveAgorot,
  requiredMonthlyAgorotForTargetDate,
} from './savingsForecast';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function run(): void {
  assertEqual(remainingToSaveAgorot(5000, 10000), 5000, 'remaining');
  assertEqual(remainingToSaveAgorot(12000, 10000), 0, 'remaining capped at 0');

  assertEqual(estimateMonthsFromMonthlyPlan(10000, 3000), 4, 'months ceil');
  assertEqual(estimateMonthsFromMonthlyPlan(0, 3000), 0, 'months zero remaining');

  assertEqual(
    inclusiveCalendarMonthsBetween('2026-03-15', '2026-05-01'),
    3,
    'calendar months inclusive',
  );
  assertEqual(compareLocalDateYmd('2026-03-01', '2026-04-01'), -1, 'compare dates');

  assertEqual(
    requiredMonthlyAgorotForTargetDate(10000, '2026-01-10', '2026-03-31'),
    3334,
    'required monthly ceil',
  );

  assertEqual(
    isPlannedMonthlySufficientForTargetDate(4000, 10000, '2026-01-10', '2026-03-31'),
    true,
    'plan sufficient',
  );
  assertEqual(
    isPlannedMonthlySufficientForTargetDate(2000, 10000, '2026-01-10', '2026-03-31'),
    false,
    'plan insufficient',
  );

  const reached = buildSavingsForecast({
    savedAgorot: 10000,
    targetAgorot: 10000,
    monthlySavingsAgorot: 500,
    targetDateYmd: '2027-01-01',
    todayYmd: '2026-01-01',
  });
  assertEqual(reached.goalReached, true, 'goal reached');
  assertEqual(reached.estimatedMonthsFromMonthlyPlan, 0, 'months when reached');

  const past = buildSavingsForecast({
    savedAgorot: 1000,
    targetAgorot: 10000,
    targetDateYmd: '2025-01-01',
    todayYmd: '2026-06-01',
  });
  assertEqual(past.targetDatePast, true, 'past target');
  assertEqual(past.monthlyPlanGap, null, 'no gap when date past');

  assertEqual(computeAdditionalMonthlyAgorot(3334, 2000), 1334, 'gap low plan');
  assertEqual(computeAdditionalMonthlyAgorot(3000, 3000), 0, 'gap equal');
  assertEqual(computeAdditionalMonthlyAgorot(2500, 4000), 0, 'gap high plan');

  const gap = computeMonthlyPlanGap({
    plannedMonthlyAgorot: 1050,
    remainingAgorot: 10000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
    goalReached: false,
    targetDatePast: false,
  });
  assertEqual(gap?.plannedMonthlyAgorot, 1050, 'gap planned agorot');
  assertEqual(gap?.requiredMonthlyAgorot, 3334, 'gap required');
  assertEqual(gap?.additionalMonthlyAgorot, 2284, 'gap additional integer');

  const both = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 10000,
    monthlySavingsAgorot: 2000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
  });
  assertEqual(both.monthlyPlanGap?.additionalMonthlyAgorot, 1334, 'forecast embeds gap');

  const currentMonth = buildSavingsForecast({
    savedAgorot: 5000,
    targetAgorot: 10000,
    monthlySavingsAgorot: 1000,
    targetDateYmd: '2026-01-25',
    todayYmd: '2026-01-10',
  });
  assertEqual(currentMonth.calendarMonthsUntilTargetDate, 1, 'current month one bucket');
  assertEqual(currentMonth.monthlyPlanGap?.requiredMonthlyAgorot, 5000, 'required in single month');

  const ils100 = 10000;
  assertEqual(classifyMonthlyPlanComparison(5000, ils100), 'insufficient', 'status 50 vs 100');
  assertEqual(classifyMonthlyPlanComparison(ils100, ils100), 'exact', 'status 100 vs 100');
  assertEqual(classifyMonthlyPlanComparison(20000, ils100), 'above', 'status 200 vs 100');

  const fiftyPlan = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 30000,
    monthlySavingsAgorot: 5000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
  });
  assertEqual(fiftyPlan.monthlyPlanGap?.comparisonStatus, 'insufficient', '50 plan insufficient');
  assertEqual(fiftyPlan.monthlyPlanGap?.additionalMonthlyAgorot, 5000, '50 plan gap 50 ils');

  const exactPlan = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 30000,
    monthlySavingsAgorot: 10000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
  });
  assertEqual(exactPlan.monthlyPlanGap?.comparisonStatus, 'exact', '100 plan exact');
  assertEqual(exactPlan.monthlyPlanGap?.additionalMonthlyAgorot, 0, '100 plan no gap');

  const highPlan = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 30000,
    monthlySavingsAgorot: 20000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
  });
  assertEqual(highPlan.monthlyPlanGap?.comparisonStatus, 'above', '200 plan above');
  assertEqual(highPlan.monthlyPlanGap?.suggestsEarlierArrival, true, '200 plan earlier by month');

  const highNoEarly = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 30000,
    monthlySavingsAgorot: 12000,
    targetDateYmd: '2026-03-31',
    todayYmd: '2026-01-10',
  });
  assertEqual(highNoEarly.monthlyPlanGap?.comparisonStatus, 'above', 'above but tight');
  assertEqual(
    planSuggestsFullMonthEarlierArrival(
      highNoEarly.estimatedMonthsFromMonthlyPlan,
      highNoEarly.calendarMonthsUntilTargetDate,
    ),
    false,
    'no full month earlier',
  );
  assertEqual(highNoEarly.monthlyPlanGap?.suggestsEarlierArrival, false, 'margin not early promise');

  const agorotPlan = buildSavingsForecast({
    savedAgorot: 0,
    targetAgorot: 10050,
    monthlySavingsAgorot: 5025,
    targetDateYmd: '2026-02-28',
    todayYmd: '2026-01-10',
  });
  assertEqual(agorotPlan.monthlyPlanGap?.plannedMonthlyAgorot, 5025, 'agorot planned');

  console.log('savingsForecast.selfCheck: all passed');
}

run();
