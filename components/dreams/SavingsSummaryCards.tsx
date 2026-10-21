import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { formatIls } from '@/utils/formatCurrency';

type SavingsSummaryCardsProps = {
  savedAmount: number;
  targetAmount: number;
  accentColor: string;
  progressPercent: number;
};

export function SavingsSummaryCards({
  savedAmount,
  targetAmount,
  accentColor,
  progressPercent,
}: SavingsSummaryCardsProps) {
  const remaining = Math.max(0, targetAmount - savedAmount);

  return (
    <View style={styles.wrap}>
      <View style={styles.cardsRow}>
        <SummaryMiniCard glyph="↑" label="נחסך" value={formatIls(savedAmount)} tint={accentColor} />
        <SummaryMiniCard glyph="◎" label="יעד" value={formatIls(targetAmount)} tint={colors.text} />
        <SummaryMiniCard glyph="…" label="נותר" value={formatIls(remaining)} tint={colors.peach} />
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${progressPercent}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
        <Text style={[styles.percent, { color: accentColor }]}>{progressPercent}%</Text>
      </View>
    </View>
  );
}

function SummaryMiniCard({
  glyph,
  label,
  value,
  tint,
}: {
  glyph: string;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={[styles.glyphCircle, { backgroundColor: `${tint}18` }]}>
        <Text style={[styles.glyph, { color: tint }]}>{glyph}</Text>
      </View>
      <Text style={styles.miniLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    marginBottom: 8,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 2,
  },
  glyphCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  glyph: {
    fontSize: 16,
    fontWeight: '700',
  },
  miniLabel: {
    ...typography.caption,
    marginBottom: 4,
  },
  miniValue: {
    ...typography.stat,
    fontSize: 13,
    textAlign: 'center',
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(38, 51, 75, 0.08)',
    overflow: 'hidden',
    marginEnd: 12,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  percent: {
    ...typography.stat,
    minWidth: 44,
    fontWeight: '700',
  },
});
