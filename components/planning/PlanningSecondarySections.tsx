import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import type { Dream } from '@/types/dream';

type PlanningAwaitingSectionProps = {
  dreams: Dream[];
};

export function PlanningAwaitingSection({ dreams }: PlanningAwaitingSectionProps) {
  const router = useRouter();

  if (dreams.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>חלומות שמחכים לתכנון</Text>
      {dreams.map((dream) => (
        <View key={dream.id} style={styles.row}>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {dream.title}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/dream/edit?id=${dream.id}` as Href)}
            style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}>
            <Text style={styles.linkLabel}>הגדרת תכנון</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

type PlanningGoalsReachedSectionProps = {
  dreams: Dream[];
};

export function PlanningGoalsReachedSection({ dreams }: PlanningGoalsReachedSectionProps) {
  const router = useRouter();

  if (dreams.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>יעדים שהושגו</Text>
      {dreams.map((dream) => (
        <Pressable
          key={dream.id}
          accessibilityRole="button"
          onPress={() => router.push(`/dream/${dream.id}` as Href)}
          style={({ pressed }) => [styles.reachedRow, pressed && styles.reachedPressed]}>
          <Text style={styles.reachedTitle} numberOfLines={1}>
            {dream.title}
          </Text>
          <View style={styles.reachedBadge}>
            <Text style={styles.reachedBadgeText}>היעד הושג</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.stat,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 10,
    color: colors.text,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
  },
  rowTitle: {
    ...typography.body,
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
  },
  linkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(118, 86, 232, 0.1)',
  },
  linkPressed: {
    opacity: 0.9,
  },
  linkLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  reachedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: 'rgba(255, 252, 247, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(80, 200, 179, 0.25)',
  },
  reachedPressed: {
    opacity: 0.92,
  },
  reachedTitle: {
    ...typography.caption,
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: colors.text,
  },
  reachedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(80, 200, 179, 0.16)',
  },
  reachedBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.mint,
  },
});
