import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import type { SavingsEntry } from '@/types/savings';
import { formatIls } from '@/utils/formatCurrency';

type SavingsHistoryListProps = {
  entries: SavingsEntry[];
  embedded?: boolean;
  isLiveHistory?: boolean;
};

export function SavingsHistoryList({
  entries,
  embedded = false,
  isLiveHistory = false,
}: SavingsHistoryListProps) {
  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <Text style={styles.heading}>היסטוריית חיסכון</Text>
      {!isLiveHistory ? (
        embedded ? (
          <Text style={styles.demoNote}>נתוני הדגמה בלבד</Text>
        ) : (
          <Text style={styles.demoNote}>נתוני הדגמה — לא נשמרים במכשיר</Text>
        )
      ) : null}

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>עדיין אין הפקדות להצגה</Text>
        </View>
      ) : (
        entries.map((entry, index) => (
          <View key={entry.id}>
            <View style={styles.row}>
              <Text style={styles.amount}>{formatIls(entry.amount)}</Text>
              <View style={styles.rowText}>
                <Text style={styles.action}>{entry.actionLabel}</Text>
                <Text style={styles.date}>{entry.dateLabel}</Text>
              </View>
            </View>
            {index < entries.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
    marginBottom: 16,
  },
  wrapEmbedded: {
    marginTop: 16,
    marginBottom: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(38, 51, 75, 0.08)',
  },
  heading: {
    ...typography.cardTitle,
    fontSize: 18,
    textAlign: 'right',
    marginBottom: 4,
  },
  demoNote: {
    ...typography.caption,
    textAlign: 'right',
    marginBottom: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    marginEnd: 12,
  },
  action: {
    ...typography.stat,
    textAlign: 'right',
  },
  date: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 2,
  },
  amount: {
    ...typography.stat,
    color: colors.primary,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.08)',
  },
  empty: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 247, 236, 0.6)',
    borderRadius: 14,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});
