/**
 * Run: npx tsx utils/recentSavingsActivity.selfCheck.ts
 */
import {
  compareRecentSavingsActivityNewestFirst,
  formatRecentSavingsActivityDate,
  mapRecentSavingsActivityRow,
  type RecentSavingsActivityItem,
} from '@/database/recentSavingsActivity';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function item(
  partial: Partial<RecentSavingsActivityItem> & Pick<RecentSavingsActivityItem, 'transactionId'>,
): RecentSavingsActivityItem {
  return {
    dreamId: 'dream-1',
    dreamTitle: 'חלום',
    type: 'deposit',
    amountAgorot: 100,
    note: null,
    createdAt: '2026-10-21T10:00:00.000Z',
    ...partial,
  };
}

function run(): void {
  const mapped = mapRecentSavingsActivityRow({
    transaction_id: 'tx-1',
    dream_id: 'd-1',
    dream_title: 'טיול',
    type: 'withdrawal',
    amount: 1234,
    note: '  ',
    created_at: '2026-10-19T08:00:00.000Z',
  });
  assertEqual(mapped.transactionId, 'tx-1', 'map id');
  assertEqual(mapped.amountAgorot, 1234, 'map agorot');
  assertEqual(mapped.type, 'withdrawal', 'map type');

  const sorted = [
    item({ transactionId: 'a', createdAt: '2026-10-20T12:00:00.000Z' }),
    item({ transactionId: 'c', createdAt: '2026-10-21T12:00:00.000Z' }),
    item({ transactionId: 'b', createdAt: '2026-10-21T12:00:00.000Z' }),
    item({ transactionId: 'd', createdAt: '2026-10-19T12:00:00.000Z' }),
  ].sort(compareRecentSavingsActivityNewestFirst);

  assertEqual(sorted[0]?.transactionId, 'c', 'newest first, id tie-break');
  assertEqual(sorted[1]?.transactionId, 'b', 'same time id desc');
  assertEqual(sorted[3]?.transactionId, 'd', 'oldest last');

  const limited = sorted.slice(0, 5);
  assertEqual(limited.length, 4, 'limit slice at most five');

  const dateLabel = formatRecentSavingsActivityDate('2026-10-21T15:00:00.000Z');
  assertEqual(typeof dateLabel, 'string', 'hebrew date string');
  assertEqual(dateLabel.includes('2026'), true, 'date includes year');

  const depositPrefix = item({ transactionId: 'dep', type: 'deposit', amountAgorot: 50000 });
  const withdrawPrefix = item({ transactionId: 'wd', type: 'withdrawal', amountAgorot: 30000 });
  assertEqual(depositPrefix.type, 'deposit', 'deposit type');
  assertEqual(withdrawPrefix.type, 'withdrawal', 'withdrawal type');

  console.log('recentSavingsActivity.selfCheck: all passed');
}

run();
