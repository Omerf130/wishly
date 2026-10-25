import { type Href, router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SavingsActivityRow } from '@/components/summary/SavingsActivityRow';
import { colors, typography } from '@/constants/theme';
import type { RecentSavingsActivityItem } from '@/database/recentSavingsActivity';

type RecentSavingsActivityProps = {
  items: RecentSavingsActivityItem[];
  loading: boolean;
  error: string | null;
  showViewAll?: boolean;
};

export function RecentSavingsActivity({
  items,
  loading,
  error,
  showViewAll = false,
}: RecentSavingsActivityProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.heading} accessibilityRole="header">
          הפעילות האחרונה שלי
        </Text>
        {showViewAll ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/summary/savings-history' as Href)}
            style={({ pressed }) => [styles.viewAllHit, pressed && styles.viewAllPressed]}>
            <Text style={styles.viewAllText}>הצג הכול</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>עדיין אין פעולות חיסכון להצגה</Text>
        </View>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <View style={styles.card}>
          {items.map((item, index) => (
            <SavingsActivityRow
              key={item.transactionId}
              item={item}
              showSeparator={index < items.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  heading: {
    ...typography.cardTitle,
    fontSize: 18,
    textAlign: 'right',
    color: colors.text,
    flexShrink: 1,
  },
  headerSpacer: {
    width: 1,
    flexShrink: 0,
  },
  viewAllHit: {
    flexShrink: 0,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  viewAllPressed: {
    opacity: 0.85,
  },
  viewAllText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '800',
    textAlign: 'left',
  },
  loadingWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorWrap: {
    backgroundColor: 'rgba(237, 134, 165, 0.1)',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.pink,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
  },
});
