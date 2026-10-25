import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SavingsHistoryList } from '@/components/dreams/SavingsHistoryList';
import { colors, typography } from '@/constants/theme';
import { agorotToIls, ilsToAgorot } from '@/database/money';
import type { SavingsEntry } from '@/types/savings';
import { formatIls, formatIlsExact, isDreamSavingsGoalReached } from '@/utils/formatCurrency';
import { formatLocalDateYmdHebrew } from '@/utils/localCalendarDate';
import {
  buildSavingsForecast,
  formatEstimatedMonthsHebrew,
  getMonthlyPlanComparisonCopy,
} from '@/utils/savingsForecast';

type DreamSavingsInfoCardProps = {
  title: string;
  subtitle?: string;
  iconGlyph: string;
  accentColor: string;
  savedAmount: number;
  targetAmount: number;
  progressPercent: number;
  historyEntries: SavingsEntry[];
  onAddSavings: () => void;
  isLiveHistory?: boolean;
  monthlySavingsAmount?: number | null;
  targetDate?: string | null;
};

export function DreamSavingsInfoCard({
  title,
  subtitle,
  iconGlyph,
  accentColor,
  savedAmount,
  targetAmount,
  progressPercent,
  historyEntries,
  onAddSavings,
  isLiveHistory = false,
  monthlySavingsAmount = null,
  targetDate = null,
}: DreamSavingsInfoCardProps) {
  const remaining = Math.max(0, targetAmount - savedAmount);
  const goalReached = isDreamSavingsGoalReached(savedAmount, targetAmount);

  const forecast = useMemo(
    () =>
      buildSavingsForecast({
        savedAgorot: ilsToAgorot(savedAmount),
        targetAgorot: ilsToAgorot(targetAmount),
        monthlySavingsAgorot:
          monthlySavingsAmount != null ? ilsToAgorot(monthlySavingsAmount) : null,
        targetDateYmd: targetDate,
      }),
    [monthlySavingsAmount, savedAmount, targetAmount, targetDate],
  );

  const monthlyPlanLabel =
    monthlySavingsAmount != null && monthlySavingsAmount > 0
      ? formatIlsExact(monthlySavingsAmount)
      : '—';

  const estimatedTimeLabel = goalReached
    ? 'היעד הושג'
    : formatEstimatedMonthsHebrew(forecast.estimatedMonthsFromMonthlyPlan);

  const hasPlanning = (monthlySavingsAmount ?? 0) > 0 || Boolean(targetDate);
  const hasMonthlyPlan = (monthlySavingsAmount ?? 0) > 0;
  const hasTargetDatePlan = Boolean(targetDate?.trim());
  const monthlyPlanGap = forecast.monthlyPlanGap;
  const comparisonCopy =
    !goalReached && hasMonthlyPlan && hasTargetDatePlan && monthlyPlanGap
      ? getMonthlyPlanComparisonCopy(monthlyPlanGap)
      : null;

  return (
    <View style={styles.card}>
      {goalReached ? (
        <View style={styles.goalReachedBadge}>
          <Text style={styles.goalReachedBadgeText}>היעד הושג</Text>
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { borderColor: accentColor }]}>
          <Text style={[styles.iconGlyph, { color: accentColor }]}>{iconGlyph}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]}
          />
        </View>

        <View style={styles.amountsRow}>
          <View style={styles.amountColPhysicalLeft}>
            <Text style={styles.amountValue}>{formatIls(targetAmount)}</Text>
            <Text style={styles.amountLabel}>יעד</Text>
          </View>
          <View style={styles.amountColPhysicalRight}>
            <Text style={[styles.amountValue, styles.amountSaved]}>{formatIls(savedAmount)}</Text>
            <Text style={styles.amountLabel}>נחסך עד עכשיו</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatChip
          label="נותר לחסוך"
          value={formatIls(remaining)}
          glyph="◎"
          tint={colors.peach}
        />
        <StatChip label="חיסכון חודשי מתוכנן" value={monthlyPlanLabel} glyph="▦" tint={colors.mint} />
        <StatChip label="זמן משוער ליעד" value={estimatedTimeLabel} glyph="◷" tint={colors.primary} />
      </View>

      {hasPlanning ? (
        <View
          style={[
            styles.planSummary,
            comparisonCopy?.tone === 'warn' && styles.planSummaryWarn,
            comparisonCopy?.tone === 'success' && styles.planSummarySuccess,
          ]}>
          <Text style={styles.planSummaryTitle}>התכנון שלך</Text>
          {targetDate ? (
            <Text style={styles.planSummaryLine}>
              תאריך יעד: {formatLocalDateYmdHebrew(targetDate)}
            </Text>
          ) : null}
          {comparisonCopy && monthlyPlanGap ? (
            <>
              <Text style={styles.planSummaryLine}>
                החיסכון שתכננת:{' '}
                <Text style={styles.planSummaryStrong}>
                  {formatIlsExact(agorotToIls(monthlyPlanGap.plannedMonthlyAgorot))}
                </Text>
              </Text>
              <Text style={styles.planSummaryLine}>
                החיסכון הנדרש:{' '}
                <Text style={styles.planSummaryStrong}>
                  {formatIlsExact(agorotToIls(monthlyPlanGap.requiredMonthlyAgorot))}
                </Text>
              </Text>
              <Text
                style={[
                  styles.planSummaryStatus,
                  comparisonCopy.tone === 'warn'
                    ? styles.planSummaryStatusWarn
                    : styles.planSummaryStatusSuccess,
                ]}>
                {comparisonCopy.statusMessage}
              </Text>
              {comparisonCopy.showGapRecommendation ? (
                <Text style={styles.planSummaryNote}>
                  כדאי להגדיל את החיסכון החודשי המתוכנן ב־
                  {formatIlsExact(agorotToIls(monthlyPlanGap.additionalMonthlyAgorot))}
                </Text>
              ) : null}
              {comparisonCopy.showEstimatedMonthsFromPlan ? (
                <Text style={styles.planSummaryLine}>
                  הערכה לפי התכנון:{' '}
                  {formatEstimatedMonthsHebrew(forecast.estimatedMonthsFromMonthlyPlan)} עד ליעד
                </Text>
              ) : null}
            </>
          ) : null}
          {!comparisonCopy &&
          hasTargetDatePlan &&
          !hasMonthlyPlan &&
          forecast.requiredMonthlyAgorotForDate != null &&
          forecast.requiredMonthlyAgorotForDate > 0 &&
          !goalReached ? (
            <Text style={styles.planSummaryLine}>
              הערכה: נדרשים כ-
              {formatIlsExact(agorotToIls(forecast.requiredMonthlyAgorotForDate))} בחודש להגעה לתאריך
            </Text>
          ) : null}
          {forecast.targetDatePast && !goalReached ? (
            <Text style={styles.planSummaryNote}>
              תאריך היעד שבחרת כבר עבר. כדאי לעדכן אותו.
            </Text>
          ) : null}
          <Text style={styles.planDisclaimer}>הערכה בלבד — החיסכון מתעדכן רק בפועל.</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onAddSavings}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaPlus}>+</Text>
        <Text style={styles.ctaLabel}>הוספת חיסכון</Text>
      </Pressable>

      <SavingsHistoryList
        entries={historyEntries}
        embedded
        isLiveHistory={isLiveHistory}
      />
    </View>
  );
}

function StatChip({
  label,
  value,
  glyph,
  tint,
}: {
  label: string;
  value: string;
  glyph: string;
  tint: string;
}) {
  return (
    <View style={styles.statChip}>
      <View style={[styles.statIcon, { backgroundColor: `${tint}20` }]}>
        <Text style={[styles.statGlyph, { color: tint }]}>{glyph}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  goalReachedBadge: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(80, 200, 179, 0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 179, 0.45)',
  },
  goalReachedBadgeText: {
    ...typography.caption,
    color: colors.mint,
    fontWeight: '700',
  },
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 16,
  },
  track: {
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(118, 86, 232, 0.12)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  amountsRow: {
    direction: 'ltr',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  amountColPhysicalLeft: {
    alignItems: 'flex-start',
    maxWidth: '48%',
  },
  amountColPhysicalRight: {
    alignItems: 'flex-end',
    maxWidth: '48%',
  },
  amountValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    writingDirection: 'rtl',
  },
  amountSaved: {
    color: colors.primary,
  },
  amountLabel: {
    ...typography.caption,
    marginTop: 4,
    writingDirection: 'rtl',
  },
  planSummary: {
    backgroundColor: 'rgba(118, 86, 232, 0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.12)',
  },
  planSummaryWarn: {
    backgroundColor: 'rgba(246, 173, 102, 0.12)',
    borderColor: 'rgba(246, 173, 102, 0.35)',
  },
  planSummarySuccess: {
    backgroundColor: 'rgba(80, 200, 179, 0.1)',
    borderColor: 'rgba(80, 200, 179, 0.32)',
  },
  planSummaryTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'right',
    marginBottom: 4,
  },
  planSummaryLine: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 2,
  },
  planSummaryStrong: {
    color: colors.text,
    fontWeight: '700',
  },
  planSummaryStatus: {
    ...typography.caption,
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
  },
  planSummaryStatusWarn: {
    color: colors.peach,
  },
  planSummaryStatusSuccess: {
    color: colors.mint,
  },
  planSummaryNote: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.peach,
    fontWeight: '600',
    marginTop: 2,
  },
  planDisclaimer: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 6,
    fontSize: 11,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'rgba(255, 247, 236, 0.95)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.06)',
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statGlyph: {
    fontSize: 13,
    fontWeight: '700',
  },
  statValue: {
    ...typography.stat,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  ctaPlus: {
    ...typography.button,
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
  ctaLabel: {
    ...typography.button,
  },
});
