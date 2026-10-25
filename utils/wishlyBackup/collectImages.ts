import type { DreamRecord } from '@/types/database';

import { assertSafeLocalDreamImageReference } from '@/utils/wishlyBackup/pathSecurity';

/** Unique local image references required for backup, stable order. */
export function collectUniqueLocalImageReferences(dreams: DreamRecord[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const dream of dreams) {
    if (dream.imageType !== 'local') {
      continue;
    }
    const safe = assertSafeLocalDreamImageReference(dream.imageReference);
    if (!seen.has(safe)) {
      seen.add(safe);
      ordered.push(safe);
    }
  }

  return ordered;
}

export function dreamIdsSet(dreams: DreamRecord[]): Set<string> {
  return new Set(dreams.map((dream) => dream.id));
}

/** Mirrors INNER JOIN backup rule for unit tests. */
export function filterTransactionsLinkedToDreams<T extends { dreamId: string }>(
  transactions: T[],
  dreamIds: Set<string>,
): T[] {
  return transactions.filter((tx) => dreamIds.has(tx.dreamId));
}
