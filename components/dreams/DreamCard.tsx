import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DreamCardMedia } from '@/components/dreams/DreamCardMedia';
import { colors, typography } from '@/constants/theme';
import type { Dream } from '@/types/dream';
import { dreamProgressPercent, formatIls } from '@/utils/formatCurrency';

type DreamCardProps = {
  dream: Dream;
};

export function DreamCard({ dream }: DreamCardProps) {
  const progressColor = colors[dream.accent];
  const percent = dreamProgressPercent(dream.savedAmount, dream.targetAmount);

  const onPress = () => {
    Alert.alert(
      'בקרוב',
      `מסך פרטי החלום «${dream.title}» יתווסף בשלב הבא.`,
      [{ text: 'הבנתי' }],
    );
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
        <Text style={styles.amounts}>
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
    marginBottom: 18,
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
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: CARD_SURFACE,
  },
  progressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(38, 51, 75, 0.07)',
    overflow: 'hidden',
    marginEnd: 12,
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
