import { type Href, Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/constants/theme';

/** Approximate vertical space of the image-picker card on dream/create (grid + padding). */
const IMAGE_CARD_SIMULATED_HEIGHT = 380;

export default function DevKeyboardTestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [targetShekels, setTargetShekels] = useState('');
  const [initialShekels, setInitialShekels] = useState('');

  if (!__DEV__) {
    return <Redirect href={'/' as Href} />;
  }

  const contentPaddingBottom = Math.max(insets.bottom, 12) + 20;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backHit}>
          <Text style={styles.backLabel}>← חזרה</Text>
        </Pressable>

        <Text style={styles.screenTitle}>בדיקת מקלדת (DEV)</Text>
        <Text style={styles.screenSubtitle}>
          ScrollView פשוט — בלי scrollTo, בלי listeners, בלי padding לפי גובה מקלדת. גלול ידנית
          ובדוק אם שדות הסכום נראים מעל המקלדת.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>מדמה כרטיס בחירת תמונות</Text>
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>גובה ~{IMAGE_CARD_SIMULATED_HEIGHT}px</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>סכום יעד (₪) *</Text>
          <TextInput
            value={targetShekels}
            onChangeText={setTargetShekels}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            textAlign="right"
          />

          <Text style={styles.label}>כבר נחסך (₪)</Text>
          <TextInput
            value={initialShekels}
            onChangeText={setInitialShekels}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            textAlign="right"
          />
        </View>

        <Text style={styles.footerHint}>
          שאלות: גלילה ידנית? שינוי גובה viewport? הסתרה גם כאן? רק ב-create?
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  backHit: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  backLabel: {
    ...typography.stat,
    color: colors.primary,
  },
  screenTitle: {
    ...typography.headline,
    textAlign: 'right',
    marginBottom: 6,
  },
  screenSubtitle: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    ...typography.stat,
    textAlign: 'right',
    marginBottom: 8,
  },
  imagePlaceholder: {
    height: IMAGE_CARD_SIMULATED_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.2)',
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  input: {
    ...typography.body,
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
    color: colors.text,
  },
  footerHint: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 24,
  },
});
