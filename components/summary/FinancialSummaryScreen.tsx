import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecentSavingsActivity } from '@/components/summary/RecentSavingsActivity';
import { SavingsProgressChart } from '@/components/summary/SavingsProgressChart';
import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import type { FinancialActivitySummary } from '@/database/financialActivitySummary';
import type { RecentSavingsActivityItem } from '@/database/recentSavingsActivity';
import type { SavingsProgressChartSeries } from '@/database/savingsProgressTimeline';
import { formatIlsExact } from '@/utils/formatCurrency';

type FinancialSummaryScreenProps = {
  summary: FinancialActivitySummary;
  loading: boolean;
  error: string | null;
  recentActivity: RecentSavingsActivityItem[];
  recentLoading: boolean;
  recentError: string | null;
  chartSeries: SavingsProgressChartSeries;
  chartLoading: boolean;
  chartError: string | null;
};

export function FinancialSummaryScreenContent({
  summary,
  loading,
  error,
  recentActivity,
  recentLoading,
  recentError,
  chartSeries,
  chartLoading,
  chartError,
}: FinancialSummaryScreenProps) {
  const showEmpty = !loading && !error && summary.dreamCount === 0;
  const showData = !loading && !error && summary.dreamCount > 0;

  const totalSavedLabel = formatIlsExact(agorotToIls(summary.totalSavedAgorot));
  const totalTargetLabel = formatIlsExact(agorotToIls(summary.totalTargetAgorot));
  const remainingLabel = formatIlsExact(agorotToIls(summary.totalRemainingAgorot));
  const depositsLabel = formatIlsExact(agorotToIls(summary.totalDepositsAgorot));
  const withdrawalsLabel = formatIlsExact(agorotToIls(summary.totalWithdrawalsAgorot));
  const progressWidth =
    summary.overallProgressPercent <= 0
      ? 0
      : summary.overallProgressPercent >= 100
        ? 100
        : Math.max(summary.overallProgressPercent, 4);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      directionalLockEnabled>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          סיכום החיסכון שלי
        </Text>
        <Text style={styles.subtitle}>תמונת מצב כספית של כל החלומות הפעילים</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>עדיין אין נתונים לסיכום</Text>
          <Text style={styles.emptyBody}>
            כשתיצור חלומות ותתחיל לחסוך, הסיכום הכספי יופיע כאן.
          </Text>
        </View>
      ) : null}

      {showData ? (
        <>
          <View style={styles.heroCard} accessibilityRole="summary">
            <Text style={styles.heroEyebrow}>סך החיסכון הנוכחי</Text>
            <Text style={styles.heroAmount}>{totalSavedLabel}</Text>
            <Text style={styles.heroTargetLine}>
              מתוך יעד כולל של {totalTargetLabel}
            </Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
            </View>

            <Text style={styles.progressPercentLine}>
              {summary.overallProgressPercent}% מהיעד הכולל
            </Text>
            <Text style={styles.remainingLine}>נותר לחסוך: {remainingLabel}</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={[styles.splitCard, styles.depositCard]}>
              <Text style={styles.splitGlyph}>▲</Text>
              <Text style={styles.splitLabel}>סך הפקדות</Text>
              <Text style={styles.splitValue}>{depositsLabel}</Text>
            </View>
            <View style={[styles.splitCard, styles.withdrawCard]}>
              <Text style={[styles.splitGlyph, styles.withdrawGlyph]}>▼</Text>
              <Text style={styles.splitLabel}>סך משיכות</Text>
              <Text style={[styles.splitValue, styles.withdrawValue]}>{withdrawalsLabel}</Text>
            </View>
          </View>

          <View style={styles.metaCard}>
            <View style={styles.metaCol}>
              <Text style={styles.metaIconDream}>◆</Text>
              <Text style={styles.metaValue}>{summary.dreamCount}</Text>
              <Text style={styles.metaLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                חלומות
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaIconTrophy} accessibilityLabel="הושלמו">
                🏆
              </Text>
              <Text style={[styles.metaValue, styles.metaValueCompleted]}>
                {summary.completedDreamsCount}
              </Text>
              <Text style={styles.metaLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                הושלמו
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaIconActions}>↕</Text>
              <Text style={styles.metaValue}>{summary.transactionCount}</Text>
              <Text style={styles.metaLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85}>
                פעולות חיסכון
              </Text>
            </View>
          </View>

          <SavingsProgressChart
            series={chartSeries}
            loading={chartLoading}
            error={chartError}
          />

          <RecentSavingsActivity
            items={recentActivity}
            loading={recentLoading}
            error={recentError}
            showViewAll={summary.transactionCount > 0}
          />

          <Text style={styles.footnote}>
            הסכומים מחושבים מפעולות של חלומות קיימים בלבד. יתרת פתיחה נכללת בהפקדות.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

export function FinancialSummaryScreen(props: FinancialSummaryScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FinancialSummaryScreenContent {...props} />
    </SafeAreaView>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    ...typography.screenTitle,
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 6,
    maxWidth: 300,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  errorWrap: {
    backgroundColor: 'rgba(237, 134, 165, 0.12)',
    borderRadius: 14,
    padding: 14,
  },
  errorText: {
    ...typography.body,
    textAlign: 'right',
    color: colors.pink,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
  },
  heroCard: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.14)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  heroEyebrow: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 6,
  },
  heroAmount: {
    ...typography.headline,
    fontSize: 32,
    lineHeight: 38,
    color: colors.primary,
    textAlign: 'right',
  },
  heroTargetLine: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 12,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(118, 86, 232, 0.12)',
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  progressFill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  progressPercentLine: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'right',
    color: colors.primary,
    marginBottom: 4,
  },
  remainingLine: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
  },
  splitRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },
  splitCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1,
    minWidth: 0,
  },
  depositCard: {
    backgroundColor: 'rgba(80, 200, 179, 0.12)',
    borderColor: 'rgba(80, 200, 179, 0.35)',
  },
  withdrawCard: {
    backgroundColor: 'rgba(246, 173, 102, 0.12)',
    borderColor: 'rgba(246, 173, 102, 0.35)',
  },
  splitGlyph: {
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 4,
    color: colors.mint,
    fontWeight: '700',
  },
  withdrawGlyph: {
    color: colors.peach,
  },
  splitLabel: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 4,
  },
  splitValue: {
    ...typography.stat,
    fontSize: 18,
    textAlign: 'right',
    color: colors.text,
    fontWeight: '800',
  },
  withdrawValue: {
    color: colors.peach,
  },
  metaCard: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
  },
  metaCol: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: 2,
  },
  metaDivider: {
    width: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.1)',
    marginVertical: 4,
  },
  metaIconDream: {
    fontSize: 11,
    color: colors.mint,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaIconTrophy: {
    fontSize: 14,
    marginBottom: 0,
  },
  metaIconActions: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 2,
  },
  metaValue: {
    ...typography.headline,
    fontSize: 20,
    lineHeight: 24,
    color: colors.text,
  },
  metaValueCompleted: {
    color: colors.primary,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textMuted,
    marginTop: 3,
    textAlign: 'center',
    width: '100%',
  },
  footnote: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'right',
    color: colors.textMuted,
  },
});
