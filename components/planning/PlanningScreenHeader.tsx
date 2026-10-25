import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

export function PlanningScreenHeader() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        התכנון שלי
      </Text>
      <Text style={styles.subtitle}>בדרך לחלומות שלי ✨</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: {
    ...typography.screenTitle,
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 36,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 6,
    color: colors.textMuted,
    maxWidth: 300,
  },
});
