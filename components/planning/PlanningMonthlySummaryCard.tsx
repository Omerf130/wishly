import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import { formatIlsExact } from '@/utils/formatCurrency';

type PlanningMonthlySummaryCardProps = {
  totalPlannedMonthlyAgorot: number;
  activePlansCount: number;
};

export function PlanningMonthlySummaryCard({
  totalPlannedMonthlyAgorot,
  activePlansCount,
}: PlanningMonthlySummaryCardProps) {
  const totalLabel = formatIlsExact(agorotToIls(totalPlannedMonthlyAgorot));

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.eyebrow}>סיכום חודשי מתוכנן</Text>
      <Text style={styles.amount}>{totalLabel}</Text>
      <Text style={styles.caption}>בחודש, לפי התוכניות הפעילות שלך</Text>
      <View style={styles.pill}>
        <Text style={styles.pillText}>
          <Text style={styles.pillNumber}>{activePlansCount}</Text>
          {' חלומות עם תוכנית פעילה'}
        </Text>
      </View>
      <Text style={styles.disclaimer}>
        זהו תכנון להכוונה בלבד — החיסכון מתעדכן רק כשמוסיפים כסף בפועל.
      </Text>
    </View>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.14)',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 6,
  },
  amount: {
    ...typography.headline,
    fontSize: 30,
    lineHeight: 36,
    color: colors.primary,
    textAlign: 'right',
  },
  caption: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 12,
  },
  pill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(80, 200, 179, 0.14)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 179, 0.35)',
  },
  pillText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  pillNumber: {
    fontWeight: '800',
    color: colors.text,
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
