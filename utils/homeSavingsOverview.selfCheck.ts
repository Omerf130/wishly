/**
 * Lightweight assertions for computeHomeSavingsOverview (no DB).
 * Run: npx tsx utils/homeSavingsOverview.selfCheck.ts
 */
import type { Dream } from '@/types/dream';

import { computeHomeSavingsOverview } from './homeSavingsOverview';

function dream(
  savedAmount: number,
  targetAmount: number,
  id = 'd',
): Dream {
  return {
    id,
    title: 'test',
    savedAmount,
    targetAmount,
    monthlySavingsAmount: null,
    targetDate: null,
    accent: 'primary',
    visual: {
      type: 'placeholder',
      backgroundColor: '#ccc',
      accentColor: '#7656E8',
      iconGlyph: '★',
    },
  };
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function run(): void {
  assertEqual(
    computeHomeSavingsOverview([]).overallProgressPercent,
    0,
    'empty dreams progress',
  );
  assertEqual(computeHomeSavingsOverview([]).dreamCount, 0, 'empty dream count');

  const one = computeHomeSavingsOverview([dream(50, 100)]);
  assertEqual(one.totalSavedAgorot, 5000, 'one dream saved agorot');
  assertEqual(one.totalTargetAgorot, 10000, 'one dream target agorot');
  assertEqual(one.overallProgressPercent, 50, 'one dream progress');
  assertEqual(one.reachedCount, 0, 'one dream not reached');

  const reached = computeHomeSavingsOverview([dream(100, 100)]);
  assertEqual(reached.reachedCount, 1, 'exact goal reached');
  assertEqual(reached.overallProgressPercent, 100, 'exact goal progress');

  const over = computeHomeSavingsOverview([dream(150, 100)]);
  assertEqual(over.totalSavedAgorot, 15000, 'over-save agorot');
  assertEqual(over.overallProgressPercent, 100, 'over-save progress capped');
  assertEqual(over.reachedCount, 1, 'over-save reached');

  const weighted = computeHomeSavingsOverview([
    dream(100, 100, 'a'),
    dream(0, 300, 'b'),
  ]);
  assertEqual(weighted.totalSavedAgorot, 10000, 'weighted saved');
  assertEqual(weighted.totalTargetAgorot, 40000, 'weighted target');
  assertEqual(weighted.overallProgressPercent, 25, 'weighted progress not average');
  assertEqual(weighted.reachedCount, 1, 'weighted reached count');

  const agorot = computeHomeSavingsOverview([dream(10.5, 20)]);
  assertEqual(agorot.totalSavedAgorot, 1050, 'fractional ils to agorot');
  assertEqual(agorot.totalTargetAgorot, 2000, 'target agorot');

  const zeroTarget = computeHomeSavingsOverview([dream(10, 0)]);
  assertEqual(zeroTarget.overallProgressPercent, 0, 'zero target no division');
  assertEqual(zeroTarget.reachedCount, 0, 'zero target not reached');

  console.log('homeSavingsOverview.selfCheck: all passed');
}

run();
