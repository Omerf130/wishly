import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/constants/theme';

type DreamGoalCelebrationProps = {
  visible: boolean;
  dreamTitle: string;
  onContinue: () => void;
};

export function DreamGoalCelebration({
  visible,
  dreamTitle,
  onContinue,
}: DreamGoalCelebrationProps) {
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  if (!visible) {
    return null;
  }

  const CardWrapper = reduceMotion ? View : Animated.View;
  const cardEntering = reduceMotion ? undefined : FadeInDown.duration(420).springify().damping(18);
  const backdropEntering = reduceMotion ? undefined : FadeIn.duration(280);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onContinue}>
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {!reduceMotion ? (
          <Animated.View entering={backdropEntering} style={StyleSheet.absoluteFill}>
            <View style={styles.backdrop} />
          </Animated.View>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.backdrop]} />
        )}

        <CardWrapper entering={cardEntering} style={styles.card}>
          <View style={styles.confettiRow}>
            <Text style={styles.confettiDot}>✦</Text>
            <Text style={styles.confettiDotAccent}>◆</Text>
            <Text style={styles.confettiDotMint}>✧</Text>
          </View>

          <Text style={styles.title}>עשית את זה! 🎉</Text>
          <Text style={styles.body}>הגעת ליעד החיסכון של החלום שלך!</Text>
          <Text style={styles.dreamName} numberOfLines={2}>
            {dreamTitle}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onContinue}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonLabel}>ממשיכים לחלום הבא</Text>
          </Pressable>
        </CardWrapper>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.45)',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
  },
  confettiRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },
  confettiDot: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  confettiDotAccent: {
    fontSize: 18,
    color: colors.peach,
    fontWeight: '700',
  },
  confettiDotMint: {
    fontSize: 18,
    color: colors.mint,
    fontWeight: '700',
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 10,
  },
  dreamName: {
    ...typography.cardTitle,
    textAlign: 'center',
    color: colors.primary,
    marginBottom: 22,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonLabel: {
    ...typography.button,
  },
});
