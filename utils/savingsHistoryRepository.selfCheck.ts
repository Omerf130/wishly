/**
 * Run: npx tsx utils/savingsHistoryRepository.selfCheck.ts
 */
import {
  buildSavingsHistorySql,
  mergeSavingsHistoryItems,
} from '@/database/savingsHistoryRepository';
import { compareRecentSavingsActivityNewestFirst } from '@/database/recentSavingsActivity';
import type { RecentSavingsActivityItem } from '@/database/recentSavingsActivity';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text: string, part: string, label: string): void {
  if (!text.includes(part)) {
    throw new Error(`${label}: expected SQL to include "${part}"`);
  }
}

function item(id: string, createdAt: string): RecentSavingsActivityItem {
  return {
    transactionId: id,
    dreamId: 'd1',
    dreamTitle: 't',
    type: 'deposit',
    amountAgorot: 100,
    note: null,
    createdAt,
  };
}

function run(): void {
  const allSql = buildSavingsHistorySql({
    typeFilter: 'all',
    dreamId: null,
    limit: 20,
    cursor: null,
  });
  assertIncludes(allSql.sql, "d.status != 'archived'", 'archived filter');
  assertIncludes(allSql.sql, 'INNER JOIN dreams', 'join dreams');
  assertEqual(allSql.params[allSql.params.length - 1], 20, 'limit param');

  const depositSql = buildSavingsHistorySql({
    typeFilter: 'deposit',
    dreamId: null,
    limit: 20,
    cursor: null,
  });
  assertIncludes(depositSql.sql, "t.type = 'deposit'", 'deposit filter');

  const withdrawSql = buildSavingsHistorySql({
    typeFilter: 'withdrawal',
    dreamId: null,
    limit: 20,
    cursor: null,
  });
  assertIncludes(withdrawSql.sql, "t.type = 'withdrawal'", 'withdrawal filter');

  const dreamSql = buildSavingsHistorySql({
    typeFilter: 'all',
    dreamId: 'dream-abc',
    limit: 20,
    cursor: null,
  });
  assertIncludes(dreamSql.sql, 't.dream_id = ?', 'dream filter');
  assertEqual(dreamSql.params.includes('dream-abc'), true, 'dream id param');

  const comboSql = buildSavingsHistorySql({
    typeFilter: 'deposit',
    dreamId: 'dream-abc',
    limit: 20,
    cursor: null,
  });
  assertIncludes(comboSql.sql, "t.type = 'deposit'", 'combo deposit');
  assertIncludes(comboSql.sql, 't.dream_id = ?', 'combo dream');

  const keysetSql = buildSavingsHistorySql({
    typeFilter: 'all',
    dreamId: null,
    limit: 20,
    cursor: { createdAt: '2026-10-01T10:00:00.000Z', transactionId: 'tx-9' },
  });
  assertIncludes(keysetSql.sql, 'datetime(t.created_at) < datetime(?)', 'keyset cursor');

  const sorted = [
    item('b', '2026-10-20T12:00:00.000Z'),
    item('a', '2026-10-21T12:00:00.000Z'),
    item('c', '2026-10-21T12:00:00.000Z'),
  ].sort(compareRecentSavingsActivityNewestFirst);
  assertEqual(sorted[0]?.transactionId, 'c', 'stable sort id desc tie');

  const merged = mergeSavingsHistoryItems(
    [item('1', '2026-10-01T00:00:00.000Z')],
    [item('1', '2026-10-01T00:00:00.000Z'), item('2', '2026-09-01T00:00:00.000Z')],
  );
  assertEqual(merged.length, 2, 'merge dedupe');
  assertEqual(merged[1]?.transactionId, '2', 'merge append');

  console.log('savingsHistoryRepository.selfCheck: all passed');
}

run();
