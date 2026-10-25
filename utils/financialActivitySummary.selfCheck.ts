/**
 * Run: npx tsx utils/financialActivitySummary.selfCheck.ts
 */
import {
  buildFinancialActivitySummaryFromTotals,
  computeFinancialProgressMetrics,
} from '@/database/financialActivitySummary';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function ilsToAgorot(ils: number): number {
  return Math.round(ils * 100);
}

function run(): void {
  const empty = buildFinancialActivitySummaryFromTotals({
    totalDepositsAgorot: 0,
    totalWithdrawalsAgorot: 0,
    transactionCount: 0,
    dreamCount: 0,
    dreams: [],
  });
  assertEqual(empty.totalSavedAgorot, 0, 'empty saved');
  assertEqual(empty.overallProgressPercent, 0, 'empty progress');
  assertEqual(empty.totalRemainingAgorot, 0, 'empty remaining');
  assertEqual(empty.completedDreamsCount, 0, 'empty completed');

  const opening = buildFinancialActivitySummaryFromTotals({
    totalDepositsAgorot: 5000,
    totalWithdrawalsAgorot: 0,
    transactionCount: 1,
    dreamCount: 1,
    dreams: [{ savedAgorot: 5000, targetAgorot: ilsToAgorot(100) }],
  });
  assertEqual(opening.totalSavedAgorot, 5000, 'opening as deposit');

  const mixed = buildFinancialActivitySummaryFromTotals({
    totalDepositsAgorot: 15050,
    totalWithdrawalsAgorot: 2000,
    transactionCount: 4,
    dreamCount: 2,
  });
  assertEqual(mixed.totalSavedAgorot, 13050, 'dep minus withdraw');
  assertEqual(mixed.totalDepositsAgorot, 15050, 'agorot preserved');

  const partial = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(5000), targetAgorot: ilsToAgorot(20000) },
  ]);
  assertEqual(partial.overallProgressPercent, 25, 'single dream 25%');
  assertEqual(partial.totalRemainingAgorot, ilsToAgorot(15000), 'single remaining 15k');

  const twoDreams = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(5000), targetAgorot: ilsToAgorot(10000) },
    { savedAgorot: ilsToAgorot(5000), targetAgorot: ilsToAgorot(30000) },
  ]);
  assertEqual(twoDreams.overallProgressPercent, 25, 'weighted 25% not average');
  assertEqual(twoDreams.totalTargetAgorot, ilsToAgorot(40000), 'two targets sum');
  assertEqual(twoDreams.totalRemainingAgorot, ilsToAgorot(30000), 'two remaining sum');

  const overGoal = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(6000), targetAgorot: ilsToAgorot(5000) },
  ]);
  assertEqual(overGoal.overallProgressPercent, 100, 'over goal progress cap');
  assertEqual(overGoal.totalRemainingAgorot, 0, 'over goal remaining zero');

  const mixedCompletion = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(6000), targetAgorot: ilsToAgorot(5000) },
    { savedAgorot: ilsToAgorot(2000), targetAgorot: ilsToAgorot(10000) },
  ]);
  assertEqual(mixedCompletion.totalRemainingAgorot, ilsToAgorot(8000), 'mixed remaining 8k');
  assertEqual(mixedCompletion.overallProgressPercent, 47, 'mixed progress ~46.67% rounded');

  const afterWithdraw = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(3000), targetAgorot: ilsToAgorot(10000) },
  ]);
  assertEqual(afterWithdraw.overallProgressPercent, 30, 'after withdraw progress');
  assertEqual(afterWithdraw.totalRemainingAgorot, ilsToAgorot(7000), 'after withdraw remaining');

  const agorot = computeFinancialProgressMetrics([
    { savedAgorot: 1050, targetAgorot: 2000 },
  ]);
  assertEqual(agorot.overallProgressPercent, 53, 'agorot progress rounded');
  assertEqual(agorot.totalRemainingAgorot, 950, 'agorot remaining');

  const zeroTarget = computeFinancialProgressMetrics([
    { savedAgorot: 1000, targetAgorot: 0 },
  ]);
  assertEqual(zeroTarget.overallProgressPercent, 0, 'zero target progress');
  assertEqual(zeroTarget.totalRemainingAgorot, 0, 'zero target remaining');
  assertEqual(zeroTarget.completedDreamsCount, 0, 'zero target not completed');

  const fiveOneDone = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(100), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(10), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(20), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(30), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(40), targetAgorot: ilsToAgorot(100) },
  ]);
  assertEqual(fiveOneDone.completedDreamsCount, 1, 'five dreams one completed');

  const fiveThreeDone = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(100), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(150), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(100), targetAgorot: ilsToAgorot(50) },
    { savedAgorot: ilsToAgorot(10), targetAgorot: ilsToAgorot(100) },
    { savedAgorot: ilsToAgorot(5), targetAgorot: ilsToAgorot(100) },
  ]);
  assertEqual(fiveThreeDone.completedDreamsCount, 3, 'five dreams three completed');

  assertEqual(overGoal.completedDreamsCount, 1, 'over goal counts once');

  const exactGoal = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(5000), targetAgorot: ilsToAgorot(5000) },
  ]);
  assertEqual(exactGoal.completedDreamsCount, 1, 'exact goal counts');

  const fellBelow = computeFinancialProgressMetrics([
    { savedAgorot: ilsToAgorot(9900), targetAgorot: ilsToAgorot(10000) },
  ]);
  assertEqual(fellBelow.completedDreamsCount, 0, 'below target after withdraw');

  const openingAtGoal = buildFinancialActivitySummaryFromTotals({
    totalDepositsAgorot: ilsToAgorot(100),
    totalWithdrawalsAgorot: 0,
    transactionCount: 1,
    dreamCount: 1,
    dreams: [{ savedAgorot: ilsToAgorot(100), targetAgorot: ilsToAgorot(100) }],
  });
  assertEqual(openingAtGoal.completedDreamsCount, 1, 'opening balance at goal');

  console.log('financialActivitySummary.selfCheck: all passed');
}

run();
