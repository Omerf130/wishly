import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import type { Dream } from '@/types/dream';
import { formatIlsExact } from '@/utils/formatCurrency';
import { computeHomeSavingsOverview } from '@/utils/homeSavingsOverview';

type HomeSavingsOverviewCardProps = {
  dreams: Dream[];
};

export function HomeSavingsOverviewCard({ dreams }: HomeSavingsOverviewCardProps) {
  const overview = useMemo(() => computeHomeSavingsOverview(dreams), [dreams]);

  const savedLabel = formatIlsExact(agorotToIls(overview.totalSavedAgorot));
  const targetLabel = formatIlsExact(agorotToIls(overview.totalTargetAgorot));

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.eyebrow}>סיכום החיסכון</Text>

      <View style={styles.progressHeader}>
        <Text style={styles.progressPercent}>{overview.overallProgressPercent}%</Text>
        <Text style={styles.progressCaption}>התקדמות כללית</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${overview.overallProgressPercent}%` }]}
        />
      </View>

      <View style={styles.amountsRow}>
        <View style={styles.amountBlock}>
          <Text style={styles.amountValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
            {savedLabel}
          </Text>
          <Text style={styles.amountLabel}>סך שנחסך</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountBlock}>
          <Text
            style={[styles.amountValue, styles.amountTarget]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}>
            {targetLabel}
          </Text>
          <Text style={styles.amountLabel}>סך יעדים</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statGlyphMint}>◆</Text>
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{overview.dreamCount}</Text>
            {' חלומות'}
          </Text>
        </View>
        <View style={styles.statPill}>
          <Text style={styles.statGlyphPeach}>✦</Text>
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{overview.reachedCount}</Text>
            {' הגיעו ליעד'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  card: {
    backgroundColor: CARD_SURFACE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.12)',
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
  progressHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressPercent: {
    ...typography.headline,
    fontSize: 26,
    lineHeight: 32,
    color: colors.primary,
  },
  progressCaption: {
    ...typography.caption,
    color: colors.textMuted,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(118, 86, 232, 0.12)',
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  amountsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  amountBlock: {
    flex: 1,
    alignItems: 'flex-end',
    minWidth: 0,
  },
  amountDivider: {
    width: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.1)',
    marginHorizontal: 10,
  },
  amountValue: {
    ...typography.stat,
    fontSize: 18,
    color: colors.text,
    fontWeight: '700',
  },
  amountTarget: {
    color: colors.textMuted,
  },
  amountLabel: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
    maxWidth: '100%',
  },
  statGlyphMint: {
    fontSize: 12,
    color: colors.mint,
    fontWeight: '700',
  },
  statGlyphPeach: {
    fontSize: 12,
    color: colors.peach,
    fontWeight: '700',
  },
  statText: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 1,
  },
  statNumber: {
    fontWeight: '800',
    color: colors.text,
  },
});
