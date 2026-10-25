import type { SQLiteDatabase } from 'expo-sqlite';

import {
  mapRecentSavingsActivityRow,
  type RecentSavingsActivityItem,
} from '@/database/recentSavingsActivity';

export type SavingsHistoryTypeFilter = 'all' | 'deposit' | 'withdrawal';

export type SavingsHistoryCursor = {
  createdAt: string;
  transactionId: string;
};

export type SavingsHistoryQuery = {
  typeFilter: SavingsHistoryTypeFilter;
  dreamId: string | null;
  limit: number;
  cursor: SavingsHistoryCursor | null;
};

export type SavingsHistoryPage = {
  items: RecentSavingsActivityItem[];
  nextCursor: SavingsHistoryCursor | null;
};

export type DreamFilterOption = {
  id: string;
  title: string;
};

type HistoryRow = Parameters<typeof mapRecentSavingsActivityRow>[0];

const SELECT_FIELDS = `SELECT
  t.id AS transaction_id,
  t.dream_id AS dream_id,
  d.title AS dream_title,
  t.type AS type,
  t.amount AS amount,
  t.note AS note,
  t.created_at AS created_at`;

const FROM_JOIN = `FROM savings_transactions t
INNER JOIN dreams d ON d.id = t.dream_id`;

export function buildSavingsHistorySql(query: SavingsHistoryQuery): {
  sql: string;
  params: (string | number)[];
} {
  const conditions: string[] = [`d.status != 'archived'`];
  const params: (string | number)[] = [];

  if (query.typeFilter === 'deposit') {
    conditions.push(`t.type = 'deposit'`);
  } else if (query.typeFilter === 'withdrawal') {
    conditions.push(`t.type = 'withdrawal'`);
  }

  if (query.dreamId) {
    conditions.push('t.dream_id = ?');
    params.push(query.dreamId);
  }

  if (query.cursor) {
    conditions.push(
      `(datetime(t.created_at) < datetime(?) OR (datetime(t.created_at) = datetime(?) AND t.id < ?))`,
    );
    params.push(query.cursor.createdAt, query.cursor.createdAt, query.cursor.transactionId);
  }

  const safeLimit = Math.max(1, Math.min(50, Math.trunc(query.limit)));
  const sql = `${SELECT_FIELDS}
${FROM_JOIN}
WHERE ${conditions.join(' AND ')}
ORDER BY datetime(t.created_at) DESC, t.id DESC
LIMIT ?`;

  params.push(safeLimit);
  return { sql, params };
}

export function mergeSavingsHistoryItems(
  existing: RecentSavingsActivityItem[],
  incoming: RecentSavingsActivityItem[],
): RecentSavingsActivityItem[] {
  if (incoming.length === 0) {
    return existing;
  }
  const seen = new Set(existing.map((item) => item.transactionId));
  const appended: RecentSavingsActivityItem[] = [];
  for (const item of incoming) {
    if (seen.has(item.transactionId)) {
      continue;
    }
    seen.add(item.transactionId);
    appended.push(item);
  }
  return appended.length > 0 ? [...existing, ...appended] : existing;
}

export async function listSavingsHistoryPage(
  db: SQLiteDatabase,
  query: SavingsHistoryQuery,
): Promise<SavingsHistoryPage> {
  const { sql, params } = buildSavingsHistorySql(query);
  const rows = await db.getAllAsync<HistoryRow>(sql, ...params);
  const items = rows.map(mapRecentSavingsActivityRow);
  const last = items[items.length - 1];
  const nextCursor =
    items.length >= Math.trunc(query.limit) && last
      ? { createdAt: last.createdAt, transactionId: last.transactionId }
      : null;
  return { items, nextCursor };
}

export async function listActiveDreamFilterOptions(
  db: SQLiteDatabase,
): Promise<DreamFilterOption[]> {
  const rows = await db.getAllAsync<{ id: string; title: string }>(
    `SELECT id, title FROM dreams WHERE status != 'archived' ORDER BY title COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ id: row.id, title: row.title }));
}
