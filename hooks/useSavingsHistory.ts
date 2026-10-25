import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getDatabase } from '@/database/client';
import type { RecentSavingsActivityItem } from '@/database/recentSavingsActivity';
import {
  listActiveDreamFilterOptions,
  listSavingsHistoryPage,
  mergeSavingsHistoryItems,
  type DreamFilterOption,
  type SavingsHistoryCursor,
  type SavingsHistoryTypeFilter,
} from '@/database/savingsHistoryRepository';

export const SAVINGS_HISTORY_PAGE_SIZE = 20;

export function useSavingsHistory() {
  const [typeFilter, setTypeFilter] = useState<SavingsHistoryTypeFilter>('all');
  const [dreamId, setDreamId] = useState<string | null>(null);
  const [dreamOptions, setDreamOptions] = useState<DreamFilterOption[]>([]);
  const [items, setItems] = useState<RecentSavingsActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<SavingsHistoryCursor | null>(null);
  const requestGenRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const loadDreamOptions = useCallback(async () => {
    const db = await getDatabase();
    const options = await listActiveDreamFilterOptions(db);
    setDreamOptions(options);
    setDreamId((current) =>
      current && !options.some((option) => option.id === current) ? null : current,
    );
  }, []);

  const fetchPage = useCallback(
    async (
      mode: 'initial' | 'more',
      generation: number,
      overrides?: Partial<{ typeFilter: SavingsHistoryTypeFilter; dreamId: string | null }>,
    ) => {
      const isCurrent = () => generation === requestGenRef.current;
      const effectiveTypeFilter = overrides?.typeFilter ?? typeFilter;
      const effectiveDreamId =
        overrides && 'dreamId' in overrides ? (overrides.dreamId ?? null) : dreamId;

      if (mode === 'initial') {
        setLoading(true);
        setError(null);
        cursorRef.current = null;
      } else {
        if (loadingMoreRef.current || !cursorRef.current) {
          return;
        }
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        const db = await getDatabase();
        const page = await listSavingsHistoryPage(db, {
          typeFilter: effectiveTypeFilter,
          dreamId: effectiveDreamId,
          limit: SAVINGS_HISTORY_PAGE_SIZE,
          cursor: mode === 'more' ? cursorRef.current : null,
        });

        if (!isCurrent()) {
          return;
        }

        if (mode === 'initial') {
          setItems(page.items);
        } else {
          setItems((prev) => mergeSavingsHistoryItems(prev, page.items));
        }
        cursorRef.current = page.nextCursor;
        setHasMore(page.nextCursor != null);
      } catch (err) {
        if (isCurrent()) {
          setError(err instanceof Error ? err.message : 'טעינת ההיסטוריה נכשלה');
        }
      } finally {
        if (isCurrent()) {
          if (mode === 'initial') {
            setLoading(false);
          } else {
            loadingMoreRef.current = false;
            setLoadingMore(false);
          }
        }
      }
    },
    [typeFilter, dreamId],
  );

  const reload = useCallback(() => {
    const generation = ++requestGenRef.current;
    void loadDreamOptions();
    void fetchPage('initial', generation);
  }, [fetchPage, loadDreamOptions]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    const generation = requestGenRef.current;
    void fetchPage('more', generation);
  }, [fetchPage, hasMore, loading, loadingMore]);

  const applyTypeFilter = useCallback(
    (next: SavingsHistoryTypeFilter) => {
      setTypeFilter(next);
      const generation = ++requestGenRef.current;
      cursorRef.current = null;
      setItems([]);
      setHasMore(false);
      void fetchPage('initial', generation, { typeFilter: next });
    },
    [fetchPage],
  );

  const applyDreamFilter = useCallback(
    (nextDreamId: string | null) => {
      setDreamId(nextDreamId);
      const generation = ++requestGenRef.current;
      cursorRef.current = null;
      setItems([]);
      setHasMore(false);
      void fetchPage('initial', generation, { dreamId: nextDreamId });
    },
    [fetchPage],
  );

  useFocusEffect(
    useCallback(() => {
      reload();
      return () => {
        requestGenRef.current += 1;
      };
    }, [reload]),
  );

  return {
    typeFilter,
    dreamId,
    dreamOptions,
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    setTypeFilter: applyTypeFilter,
    setDreamId: applyDreamFilter,
    loadMore,
    reload,
  };
}
