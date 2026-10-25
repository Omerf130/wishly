import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

type HomeHeaderProps = {
  onPressSettings: () => void;
  onPressAddDream: () => void;
};

const HEADER_HEIGHT = 52;

export function HomeHeader({ onPressSettings, onPressAddDream }: HomeHeaderProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="הגדרות"
          onPress={onPressSettings}
          android_ripple={{ color: 'rgba(118, 86, 232, 0.14)', borderless: false }}
          style={({ pressed }) => [
            styles.sideButton,
            styles.settingsButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.settingsGlyph} allowFontScaling={false}>
            ⚙
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="הוספת חלום חדש"
          onPress={onPressAddDream}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.25)', borderless: false }}
          style={({ pressed }) => [
            styles.sideButton,
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}>
          <Text style={styles.addGlyph}>+</Text>
        </Pressable>
      </View>

      <View style={styles.titleBlock} pointerEvents="none">
        <Text style={styles.title} accessibilityRole="header">
          החלומות שלי
        </Text>
        <Text style={styles.subtitle}>כל צע קטן מקרב אותך ליעד — ואתה בוחר את הקצב.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
    paddingTop: 2,
  },
  toolbar: {
    height: HEADER_HEIGHT,
    position: 'relative',
  },
  sideButton: {
    position: 'absolute',
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  settingsButton: {
    left: 0,
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
      },
      android: {
        elevation: 0,
      },
      default: {},
    }),
  },
  addButton: {
    right: 0,
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  addButtonPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.96 }],
  },
  settingsGlyph: {
    fontSize: 20,
    color: colors.text,
  },
  addGlyph: {
    fontSize: 26,
    fontWeight: '300',
    color: colors.white,
    marginTop: -2,
  },
  titleBlock: {
    alignItems: 'center',
    paddingHorizontal: 56,
    marginTop: -HEADER_HEIGHT,
    paddingTop: HEADER_HEIGHT + 2,
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
    marginTop: 5,
    maxWidth: 300,
    lineHeight: 18,
  },
});
