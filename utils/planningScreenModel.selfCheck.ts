/**
 * Run: npx tsx utils/planningScreenModel.selfCheck.ts
 */
import type { Dream } from '@/types/dream';

import { buildPlanningScreenModel, dreamHasPlanningField } from './planningScreenModel';

function dream(
  partial: Pick<Dream, 'id' | 'title' | 'savedAmount' | 'targetAmount'> &
    Partial<Pick<Dream, 'monthlySavingsAmount' | 'targetDate'>>,
): Dream {
  return {
    accent: 'primary',
    monthlySavingsAmount: null,
    targetDate: null,
    visual: {
      type: 'placeholder',
      backgroundColor: '#ccc',
      accentColor: '#7656E8',
      iconGlyph: '★',
    },
    ...partial,
  };
}

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function run(): void {
  assertEqual(buildPlanningScreenModel([]).activePlans.length, 0, 'empty');

  const monthlyOnly = buildPlanningScreenModel([
    dream({
      id: 'a',
      title: 'A',
      savedAmount: 0,
      targetAmount: 100,
      monthlySavingsAmount: 10,
    }),
  ]);
  assertEqual(monthlyOnly.monthlySummary.totalPlannedMonthlyAgorot, 1000, 'monthly agorot sum');
  assertEqual(monthlyOnly.activePlans.length, 1, 'active plan');
  assertEqual(monthlyOnly.awaitingPlanning.length, 0, 'no awaiting');

  const reached = buildPlanningScreenModel([
    dream({
      id: 'b',
      title: 'B',
      savedAmount: 100,
      targetAmount: 100,
      monthlySavingsAmount: 50,
    }),
  ]);
  assertEqual(reached.goalsReached.length, 1, 'reached bucket');
  assertEqual(reached.monthlySummary.totalPlannedMonthlyAgorot, 0, 'reached excluded from sum');

  const awaiting = buildPlanningScreenModel([
    dream({ id: 'c', title: 'C', savedAmount: 0, targetAmount: 50 }),
  ]);
  assertEqual(awaiting.awaitingPlanning.length, 1, 'awaiting');
  assertEqual(dreamHasPlanningField(awaiting.awaitingPlanning[0]), false, 'no plan fields');

  const mixed = buildPlanningScreenModel([
    dream({ id: '1', title: '1', savedAmount: 0, targetAmount: 100, monthlySavingsAmount: 5 }),
    dream({ id: '2', title: '2', savedAmount: 0, targetAmount: 100, targetDate: '2027-01-01' }),
    dream({ id: '3', title: '3', savedAmount: 0, targetAmount: 100 }),
    dream({ id: '4', title: '4', savedAmount: 200, targetAmount: 100 }),
  ]);
  assertEqual(mixed.activePlans.length, 2, 'two active');
  assertEqual(mixed.awaitingPlanning.length, 1, 'one awaiting');
  assertEqual(mixed.goalsReached.length, 1, 'one reached');
  assertEqual(mixed.monthlySummary.totalPlannedMonthlyAgorot, 500, 'only first monthly');

  console.log('planningScreenModel.selfCheck: all passed');
}

run();
