/**
 * Run: npx tsx utils/savingsProgressTimeline.selfCheck.ts
 */
import type { SavingsTimelineTransaction } from '@/database/savingsProgressTimeline';
import {
  buildSavingsProgressChartSeries,
  countUniqueActivityDays,
  downsampleChartPointsForDisplay,
  totalSavedAgorotFromTransactions,
} from '@/utils/savingsProgressTimeline';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function tx(
  id: string,
  type: 'deposit' | 'withdrawal',
  amountAgorot: number,
  createdAt: string,
): SavingsTimelineTransaction {
  return { transactionId: id, type, amountAgorot, createdAt };
}

function run(): void {
  const singleDayTxs = [
    tx('a', 'deposit', 100000, '2026-01-15T08:00:00.000Z'),
    tx('b', 'withdrawal', 20000, '2026-01-15T08:00:00.000Z'),
    tx('c', 'deposit', 50000, '2026-01-15T20:00:00.000Z'),
  ];
  const singleDay = buildSavingsProgressChartSeries({
    transactions: singleDayTxs,
    todayYmd: '2026-01-15',
  });
  assertEqual(singleDay.mode, 'singleDay', 'single day mode');
  assertEqual(singleDay.points[0]?.balanceAgorot, 0, 'single day opening');
  assertEqual(singleDay.points.length, 4, 'single day per tx points');
  assertEqual(singleDay.points[singleDay.points.length - 1]?.balanceAgorot, 130000, 'single day end');

  const multiDay = buildSavingsProgressChartSeries({
    transactions: [
      tx('1', 'deposit', 100000, '2026-01-10T10:00:00.000Z'),
      tx('2', 'deposit', 50000, '2026-01-12T10:00:00.000Z'),
    ],
    todayYmd: '2026-01-12',
  });
  assertEqual(multiDay.mode, 'multiDay', 'multi day mode');
  assertEqual(multiDay.points[multiDay.points.length - 1]?.balanceAgorot, 150000, 'multi day end');

  assertEqual(countUniqueActivityDays(singleDayTxs), 1, 'unique days one');
  assertEqual(
    countUniqueActivityDays([
      tx('x', 'deposit', 1, '2026-01-01T10:00:00.000Z'),
      tx('y', 'deposit', 1, '2026-01-02T10:00:00.000Z'),
    ]),
    2,
    'unique days two',
  );

  const sameSecond = buildSavingsProgressChartSeries({
    transactions: [
      tx('id-a', 'deposit', 1000, '2026-03-01T12:00:00.000Z'),
      tx('id-b', 'deposit', 2000, '2026-03-01T12:00:00.000Z'),
    ],
    todayYmd: '2026-03-01',
  });
  assertEqual(sameSecond.points.length, 3, 'same timestamp separate points');

  const txs = [
    tx('1', 'deposit', 1000, '2026-06-01T10:00:00.000Z'),
    tx('2', 'deposit', 2000, '2026-06-02T10:00:00.000Z'),
  ];
  assertEqual(
    totalSavedAgorotFromTransactions(txs),
    buildSavingsProgressChartSeries({ transactions: txs, todayYmd: '2026-06-02' }).points.at(-1)
      ?.balanceAgorot,
    'final matches total saved',
  );

  const manyPoints = buildSavingsProgressChartSeries({
    transactions: Array.from({ length: 30 }, (_, i) =>
      tx(`t-${i}`, 'deposit', 100, `2026-07-${String((i % 28) + 1).padStart(2, '0')}T10:00:00.000Z`),
    ),
    todayYmd: '2026-07-28',
  }).points;
  const sampled = downsampleChartPointsForDisplay(manyPoints, 12);
  assertEqual(sampled[0]?.pointId, manyPoints[0]?.pointId, 'downsample keeps start');
  assertEqual(sampled[sampled.length - 1]?.pointId, manyPoints[manyPoints.length - 1]?.pointId, 'downsample keeps end');

  const agorot = totalSavedAgorotFromTransactions([
    tx('a', 'deposit', 1050, '2026-04-01T10:00:00.000Z'),
  ]);
  assertEqual(agorot, 1050, 'agorot preserved');

  console.log('savingsProgressTimeline.selfCheck: all passed');
}

run();
