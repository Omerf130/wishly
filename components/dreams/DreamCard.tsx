import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DreamCardMedia } from '@/components/dreams/DreamCardMedia';
import { colors, typography } from '@/constants/theme';
import type { Dream } from '@/types/dream';
import {
  dreamProgressPercent,
  formatIls,
  isDreamSavingsGoalReached,
} from '@/utils/formatCurrency';

type DreamCardProps = {
  dream: Dream;
};

export function DreamCard({ dream }: DreamCardProps) {
  const router = useRouter();
  const progressColor = colors[dream.accent];
  const percent = dreamProgressPercent(dream.savedAmount, dream.targetAmount);
  const goalReached = isDreamSavingsGoalReached(dream.savedAmount, dream.targetAmount);

  const onPress = () => {
    router.push(`/dream/${dream.id}` as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dream.title}, ${percent} אחוז מהיעד`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <DreamCardMedia
        title={dream.title}
        visual={dream.visual}
        accentColor={progressColor}
      />

      <View style={styles.body}>
        {goalReached ? (
          <View style={styles.goalReachedPill}>
            <Text style={styles.goalReachedPillText}>היעד הושג</Text>
          </View>
        ) : null}
        <View style={styles.progressBlock}>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${percent}%`, backgroundColor: progressColor },
              ]}
            />
          </View>
          <Text style={[styles.percent, { color: progressColor }]}>{percent}%</Text>
        </View>
        <Text style={styles.amounts} numberOfLines={2}>
          <Text style={styles.amountSaved}>{formatIls(dream.savedAmount)} </Text>
          <Text style={styles.amountMuted}>נחסכו · יעד </Text>
          <Text style={styles.amountTarget}>{formatIls(dream.targetAmount)}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

const CARD_SURFACE = '#FFFCF7';

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: CARD_SURFACE,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.995 }],
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: CARD_SURFACE,
  },
  goalReachedPill: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(80, 200, 179, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 179, 0.35)',
  },
  goalReachedPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(38, 51, 75, 0.07)',
    overflow: 'hidden',
    marginEnd: 10,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  percent: {
    ...typography.stat,
    minWidth: 42,
    textAlign: 'left',
    fontSize: 16,
    fontWeight: '700',
  },
  amounts: {
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
  },
  amountSaved: {
    ...typography.stat,
    color: colors.text,
  },
  amountMuted: {
    ...typography.caption,
    color: colors.textMuted,
  },
  amountTarget: {
    ...typography.stat,
    color: colors.text,
  },
});
