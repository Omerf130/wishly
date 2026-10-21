import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

export function DreamsEmptyState() {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>✨</Text>
      <Text style={styles.title}>עדיין אין חלומות כאן</Text>
      <Text style={styles.body}>
        בואו ניצור את החלום הראשון — תמונה, יעד וחיסכון בקצב שלך.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/dream/create' as Href)}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaLabel}>יצירת החלום הראשון שלי</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
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
    marginBottom: 20,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  ctaLabel: {
    ...typography.button,
  },
});
