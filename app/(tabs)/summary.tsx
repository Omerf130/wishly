import { FinancialSummaryScreen } from '@/components/summary/FinancialSummaryScreen';
import { useFinancialActivitySummary } from '@/hooks/useFinancialActivitySummary';

export default function SummaryScreen() {
  const {
    summary,
    loading,
    error,
    recentActivity,
    recentLoading,
    recentError,
    chartSeries,
    chartLoading,
    chartError,
  } = useFinancialActivitySummary();

  return (
    <FinancialSummaryScreen
      summary={summary}
      loading={loading}
      error={error}
      recentActivity={recentActivity}
      recentLoading={recentLoading}
      recentError={recentError}
      chartSeries={chartSeries}
      chartLoading={chartLoading}
      chartError={chartError}
    />
  );
}
