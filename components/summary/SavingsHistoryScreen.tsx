import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SavingsActivityRow } from '@/components/summary/SavingsActivityRow';
import { colors, typography } from '@/constants/theme';
import type { SavingsHistoryTypeFilter } from '@/database/savingsHistoryRepository';
import { useSavingsHistory } from '@/hooks/useSavingsHistory';

const TYPE_OPTIONS: { id: SavingsHistoryTypeFilter; label: string }[] = [
  { id: 'all', label: 'הכול' },
  { id: 'deposit', label: 'הפקדות' },
  { id: 'withdrawal', label: 'משיכות' },
];

export function SavingsHistoryScreen() {
  const router = useRouter();
  const {
    typeFilter,
    dreamId,
    dreamOptions,
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    setTypeFilter,
    setDreamId,
    loadMore,
  } = useSavingsHistory();

  const [dreamPickerOpen, setDreamPickerOpen] = useState(false);

  const selectedDreamLabel = useMemo(() => {
    if (!dreamId) {
      return 'כל החלומות';
    }
    return dreamOptions.find((option) => option.id === dreamId)?.title ?? 'כל החלומות';
  }, [dreamId, dreamOptions]);

  const listEmpty = !loading && !error && items.length === 0;
  const noDreams = !loading && dreamOptions.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backHit, pressed && styles.backPressed]}>
          <Text style={styles.backLabel}>→ חזרה</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">
          היסטוריית החיסכון
        </Text>
        <Text style={styles.subtitle}>כל הפעולות שביצעת בחלומות שלך</Text>
      </View>

      <View style={styles.filtersWrap}>
        <View style={styles.typeFilterRow}>
          {TYPE_OPTIONS.map((option) => {
            const active = typeFilter === option.id;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTypeFilter(option.id)}
                style={[styles.typeChip, active && styles.typeChipActive]}>
                <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setDreamPickerOpen(true)}
          style={({ pressed }) => [styles.dreamPicker, pressed && styles.dreamPickerPressed]}>
          <Text style={styles.dreamPickerLabel}>חלום</Text>
          <Text style={styles.dreamPickerValue} numberOfLines={1}>
            {selectedDreamLabel}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {noDreams ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>עדיין אין חלומות</Text>
          <Text style={styles.emptyBody}>כשתיצור חלומות, ההיסטוריה תופיע כאן.</Text>
        </View>
      ) : null}

      {!noDreams && listEmpty ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>אין פעולות להצגה</Text>
          <Text style={styles.emptyBody}>נסו לשנות את המסננים או לבצע הפקדה או משיכה.</Text>
        </View>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <View style={styles.listCard}>
          <FlatList
            data={items}
            keyExtractor={(item) => item.transactionId}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : hasMore ? null : (
                <View style={styles.footerEnd} />
              )
            }
            renderItem={({ item, index }) => (
              <SavingsActivityRow item={item} showSeparator={index < items.length - 1} />
            )}
          />
        </View>
      ) : null}

      <Modal
        visible={dreamPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDreamPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDreamPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modalTitle}>בחירת חלום</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDreamId(null);
                setDreamPickerOpen(false);
              }}
              style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}>
              <Text style={[styles.modalOptionText, !dreamId && styles.modalOptionTextActive]}>
                כל החלומות
              </Text>
            </Pressable>
            {dreamOptions.map((option) => {
              const active = dreamId === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  onPress={() => {
                    setDreamId(option.id);
                    setDreamPickerOpen(false);
                  }}
                  style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}>
                  <Text
                    style={[styles.modalOptionText, active && styles.modalOptionTextActive]}
                    numberOfLines={2}>
                    {option.title}
                  </Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backHit: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 8,
  },
  backPressed: {
    opacity: 0.85,
  },
  backLabel: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    ...typography.screenTitle,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 6,
  },
  filtersWrap: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 10,
  },
  typeFilterRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.12)',
    backgroundColor: colors.white,
  },
  typeChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(118, 86, 232, 0.12)',
  },
  typeChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  dreamPicker: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-end',
  },
  dreamPickerPressed: {
    opacity: 0.92,
  },
  dreamPickerLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
  },
  dreamPickerValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorWrap: {
    marginHorizontal: 18,
    backgroundColor: 'rgba(237, 134, 165, 0.12)',
    borderRadius: 14,
    padding: 12,
  },
  errorText: {
    ...typography.body,
    textAlign: 'right',
    color: colors.pink,
  },
  emptyWrap: {
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textMuted,
  },
  listCard: {
    flex: 1,
    marginHorizontal: 18,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(38, 51, 75, 0.08)',
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: 16,
  },
  footerEnd: {
    height: 4,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxHeight: '70%',
  },
  modalTitle: {
    ...typography.cardTitle,
    textAlign: 'right',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  modalOptionPressed: {
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
  },
  modalOptionText: {
    ...typography.body,
    textAlign: 'right',
    color: colors.text,
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
});
