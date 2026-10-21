import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

const PRESETS = [0, 25, 50, 75, 100] as const;

type RevealDevControlsProps = {
  previewProgress: number;
  onSelect: (value: number) => void;
  onReset: () => void;
};

export function RevealDevControls({
  previewProgress,
  onSelect,
  onReset,
}: RevealDevControlsProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.devTag}>כלי פיתוח</Text>
      <Text style={styles.title}>מצב בדיקה — חשיפת תמונה</Text>
      <Text style={styles.subtitle}>
        לא משנה את סכומי החיסכון · להסרה לפני השקה
      </Text>
      <View style={styles.row}>
        {PRESETS.map((value) => {
          const active = previewProgress === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              onPress={() => onSelect(value)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{value}%</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" onPress={onReset} style={styles.reset}>
        <Text style={styles.resetText}>איפוס לפי התקדמות אמיתית</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(246, 173, 102, 0.5)',
    backgroundColor: 'rgba(246, 173, 102, 0.12)',
  },
  devTag: {
    ...typography.caption,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(38, 51, 75, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
    fontWeight: '700',
  },
  title: {
    ...typography.stat,
    textAlign: 'right',
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.12)',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.white,
  },
  reset: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  resetText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
