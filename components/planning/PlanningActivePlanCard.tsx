import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import type { PlanningActiveDream } from '@/utils/planningScreenModel';
import { formatIlsExact } from '@/utils/formatCurrency';
import { formatLocalDateYmdHebrew } from '@/utils/localCalendarDate';
import {
  formatEstimatedMonthsHebrew,
  getMonthlyPlanComparisonCopy,
} from '@/utils/savingsForecast';

type PlanningActivePlanCardProps = {
  entry: PlanningActiveDream;
  onPressDetails: () => void;
};

export function PlanningActivePlanCard({ entry, onPressDetails }: PlanningActivePlanCardProps) {
  const router = useRouter();
  const { dream, forecast, hasMonthlyPlan, hasTargetDatePlan, monthlyAgorot } = entry;
  const accent = colors[dream.accent];
  const remainingLabel = formatIlsExact(agorotToIls(forecast.remainingAgorot));

  const onPressUpdatePlan = () => {
    router.push(`/dream/edit?id=${dream.id}` as Href);
  };

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={onPressDetails}
        style={({ pressed }) => [pressed && styles.cardPressed]}>
        <View style={styles.titleRow}>
          <View style={[styles.accentDot, { backgroundColor: accent }]} />
          <Text style={styles.title} numberOfLines={2}>
            {dream.title}
          </Text>
        </View>

        <View style={styles.metaBlock}>
          {hasMonthlyPlan && monthlyAgorot != null ? (
            <Text style={styles.metaLine}>
              חיסכון חודשי מתוכנן:{' '}
              <Text style={styles.metaValue}>{formatIlsExact(dream.monthlySavingsAmount!)}</Text>
            </Text>
          ) : null}
          {hasTargetDatePlan && dream.targetDate ? (
            <Text style={styles.metaLine}>
              תאריך יעד:{' '}
              <Text style={styles.metaValue}>{formatLocalDateYmdHebrew(dream.targetDate)}</Text>
            </Text>
          ) : null}
          <Text style={styles.metaLine}>
            נותר לחסוך: <Text style={styles.metaValue}>{remainingLabel}</Text>
          </Text>
        </View>
      </Pressable>

      <PlanningForecastPanel entry={entry} />

      <Pressable
        accessibilityRole="button"
        onPress={onPressUpdatePlan}
        style={({ pressed }) => [styles.updateButton, pressed && styles.updateButtonPressed]}>
        <Text style={styles.updateButtonLabel}>עדכון התכנון</Text>
      </Pressable>
    </View>
  );
}

function PlanningForecastPanel({ entry }: { entry: PlanningActiveDream }) {
  const { forecast, hasMonthlyPlan, hasTargetDatePlan } = entry;
  const gap = forecast.monthlyPlanGap;

  if (hasTargetDatePlan && forecast.targetDatePast && !forecast.goalReached) {
    return (
      <View style={[styles.panel, styles.panelWarn]}>
        <Text style={[styles.panelText, styles.panelTextWarn]}>
          תאריך היעד שבחרת כבר עבר. כדאי לעדכן אותו.
        </Text>
        <Text style={styles.disclaimer}>הערכה בלבד — לא התחייבות.</Text>
      </View>
    );
  }

  if (forecast.goalReached) {
    return null;
  }

  if (hasMonthlyPlan && hasTargetDatePlan && gap) {
    const copy = getMonthlyPlanComparisonCopy(gap);
    const isInsufficient = copy.tone === 'warn';
    const panelStyle = isInsufficient ? styles.panelWarn : styles.panelSuccess;
    const statusTextStyle = isInsufficient ? styles.panelTextWarn : styles.panelTextSuccess;

    return (
      <View style={[styles.panel, panelStyle]}>
        <Text style={styles.compareRow}>
          החיסכון שתכננת:{' '}
          <Text style={styles.compareValue}>
            {formatIlsExact(agorotToIls(gap.plannedMonthlyAgorot))}
          </Text>
        </Text>
        <Text style={styles.compareRow}>
          החיסכון הנדרש:{' '}
          <Text style={styles.compareValue}>
            {formatIlsExact(agorotToIls(gap.requiredMonthlyAgorot))}
          </Text>
        </Text>
        <Text style={[styles.statusMessage, statusTextStyle]}>{copy.statusMessage}</Text>
        {copy.showGapRecommendation ? (
          <Text style={styles.gapRecommendation}>
            כדאי להגדיל את החיסכון החודשי המתוכנן ב־
            {formatIlsExact(agorotToIls(gap.additionalMonthlyAgorot))}
          </Text>
        ) : null}
        {copy.showEstimatedMonthsFromPlan &&
        forecast.estimatedMonthsFromMonthlyPlan != null ? (
          <Text style={[styles.monthsHint, styles.panelTextSuccess]}>
            הערכה לפי התכנון:{' '}
            {formatEstimatedMonthsHebrew(forecast.estimatedMonthsFromMonthlyPlan)} עד ליעד
          </Text>
        ) : null}
        <Text style={styles.disclaimer}>הערכה בלבד — לא התחייבות.</Text>
      </View>
    );
  }

  if (hasMonthlyPlan && !hasTargetDatePlan) {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelText}>
          הערכה: {formatEstimatedMonthsHebrew(forecast.estimatedMonthsFromMonthlyPlan)} עד ליעד
        </Text>
        <Text style={styles.disclaimer}>הערכה בלבד — לא התחייבות.</Text>
      </View>
    );
  }

  if (hasTargetDatePlan && !hasMonthlyPlan) {
    const required = forecast.requiredMonthlyAgorotForDate;
    return (
      <View style={styles.panel}>
        {required != null && required > 0 ? (
          <Text style={styles.panelText}>
            הערכה: נדרשים כ-
            {formatIlsExact(agorotToIls(required))} בחודש להגעה לתאריך
          </Text>
        ) : null}
        <Text style={styles.panelHint}>אפשר להגדיר גם סכום חודשי מתוכנן ב«עדכון התכנון».</Text>
        <Text style={styles.disclaimer}>הערכה בלבד — לא התחייבות.</Text>
      </View>
    );
  }

  return null;
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  title: {
    ...typography.cardTitle,
    flex: 1,
    textAlign: 'right',
  },
  metaBlock: {
    gap: 4,
    marginBottom: 4,
  },
  metaLine: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
  },
  metaValue: {
    color: colors.text,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.12)',
  },
  panelSuccess: {
    backgroundColor: 'rgba(80, 200, 179, 0.12)',
    borderColor: 'rgba(80, 200, 179, 0.35)',
  },
  panelWarn: {
    backgroundColor: 'rgba(246, 173, 102, 0.14)',
    borderColor: 'rgba(246, 173, 102, 0.35)',
  },
  panelText: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.primary,
    fontWeight: '600',
  },
  panelTextSuccess: {
    color: colors.mint,
  },
  panelTextWarn: {
    color: colors.peach,
    fontWeight: '700',
  },
  panelHint: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
  },
  compareRow: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 4,
  },
  compareValue: {
    color: colors.text,
    fontWeight: '700',
  },
  statusMessage: {
    ...typography.caption,
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 8,
  },
  gapRecommendation: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.peach,
    fontWeight: '700',
    marginTop: 6,
  },
  monthsHint: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 6,
    fontWeight: '600',
  },
  disclaimer: {
    ...typography.caption,
    fontSize: 11,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 6,
  },
  updateButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  updateButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  updateButtonLabel: {
    ...typography.button,
    fontSize: 15,
  },
});
