import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

export function DevSqliteTestLink() {
  const router = useRouter();

  if (!__DEV__) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/dev/sqlite-test' as Href)}
      style={styles.link}>
      <Text style={styles.linkText}>בדיקת SQLite (Android / Dev)</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  linkText: {
    ...typography.caption,
    color: colors.mint,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
