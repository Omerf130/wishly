import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

type DreamDetailHeaderProps = {
  title: string;
  iconGlyph: string;
  accentColor: string;
  onBack: () => void;
};

export function DreamDetailHeader({
  title,
  iconGlyph,
  accentColor,
  onBack,
}: DreamDetailHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="חזרה"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}>
        <Text style={styles.backGlyph}>→</Text>
      </Pressable>

      <View style={styles.titleWrap}>
        <View style={[styles.iconBadge, { borderColor: accentColor }]}>
          <Text style={[styles.iconGlyph, { color: accentColor }]}>{iconGlyph}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
      </View>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  backPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  backGlyph: {
    fontSize: 22,
    color: colors.text,
    fontWeight: '600',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    ...typography.cardTitle,
    flexShrink: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 44,
  },
});
