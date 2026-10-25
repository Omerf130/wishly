import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getDatabase } from '@/database/client';
import { getFinancialActivitySummary } from '@/database/financialActivitySummary';
import type { FinancialActivitySummary } from '@/database/financialActivitySummary';
import {
  listRecentSavingsActivity,
  type RecentSavingsActivityItem,
} from '@/database/recentSavingsActivity';
import {
  listSavingsTimelineTransactions,
  type SavingsProgressChartSeries,
} from '@/database/savingsProgressTimeline';
import { buildSavingsProgressChartSeries } from '@/utils/savingsProgressTimeline';

const EMPTY_SUMMARY: FinancialActivitySummary = {
  totalSavedAgorot: 0,
  totalDepositsAgorot: 0,
  totalWithdrawalsAgorot: 0,
  transactionCount: 0,
  dreamCount: 0,
  totalTargetAgorot: 0,
  totalRemainingAgorot: 0,
  overallProgressPercent: 0,
  completedDreamsCount: 0,
};

export function useFinancialActivitySummary() {
  const [summary, setSummary] = useState<FinancialActivitySummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentSavingsActivityItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<SavingsProgressChartSeries>({
    mode: 'multiDay',
    points: [],
  });
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const refresh = useCallback(async (generation: number) => {
    const isCurrent = () => generation === loadGenerationRef.current;

    setError(null);
    setRecentError(null);
    setChartError(null);

    let db;
    try {
      db = await getDatabase();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'טעינת הנתונים נכשלה';
      if (isCurrent()) {
        setError(message);
        setRecentError(message);
        setLoading(false);
        setRecentLoading(false);
        setChartLoading(false);
      }
      return;
    }

    await Promise.all([
      (async () => {
        try {
          const next = await getFinancialActivitySummary(db);
          if (isCurrent()) {
            setSummary(next);
          }
        } catch (err) {
          if (isCurrent()) {
            setError(err instanceof Error ? err.message : 'טעינת הסיכום נכשלה');
          }
        } finally {
          if (isCurrent()) {
            setLoading(false);
          }
        }
      })(),
      (async () => {
        try {
          const items = await listRecentSavingsActivity(db, 5);
          if (isCurrent()) {
            setRecentActivity(items);
          }
        } catch (err) {
          if (isCurrent()) {
            setRecentError(
              err instanceof Error ? err.message : 'טעינת הפעילות האחרונה נכשלה',
            );
          }
        } finally {
          if (isCurrent()) {
            setRecentLoading(false);
          }
        }
      })(),
      (async () => {
        try {
          const transactions = await listSavingsTimelineTransactions(db);
          const series = buildSavingsProgressChartSeries({ transactions });
          if (isCurrent()) {
            setChartSeries(series);
          }
        } catch (err) {
          if (isCurrent()) {
            setChartError(err instanceof Error ? err.message : 'טעינת הגרף נכשלה');
          }
        } finally {
          if (isCurrent()) {
            setChartLoading(false);
          }
        }
      })(),
    ]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const generation = ++loadGenerationRef.current;
      setLoading(true);
      setRecentLoading(true);
      setChartLoading(true);
      void refresh(generation);

      return () => {
        loadGenerationRef.current += 1;
      };
    }, [refresh]),
  );

  return {
    summary,
    loading,
    error,
    recentActivity,
    recentLoading,
    recentError,
    chartSeries,
    chartLoading,
    chartError,
    refresh,
  };
}
