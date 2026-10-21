import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

type NewDreamCardProps = {
  onPress: () => void;
};

export function NewDreamCard({ onPress }: NewDreamCardProps) {

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="חלום חדש"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.iconCircle}>
        <Text style={styles.plus}>+</Text>
      </View>
      <Text style={styles.title}>חלום חדש</Text>
      <Text style={styles.description}>מה היעד הבא שלך?</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(118, 86, 232, 0.35)',
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    marginBottom: 20,
  },
  cardPressed: {
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
  plus: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '300',
    marginTop: -2,
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    ...typography.caption,
    textAlign: 'center',
  },
});
