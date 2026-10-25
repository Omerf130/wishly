import { type Href, router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { agorotToIls } from '@/database/money';
import type { RecentSavingsActivityItem } from '@/database/recentSavingsActivity';
import { formatRecentSavingsActivityDate } from '@/database/recentSavingsActivity';
import { formatIlsExact } from '@/utils/formatCurrency';

export const SAVINGS_ACTIVITY_AMOUNT_DEPOSIT = '#2EAA94';
export const SAVINGS_ACTIVITY_AMOUNT_WITHDRAWAL = '#D9894A';

export function formatSavingsActivityDateLabel(createdAt: string): string {
  const label = formatRecentSavingsActivityDate(createdAt);
  return `\u2067${label}\u2069`;
}

function ActivityTypeIcon({ isWithdrawal }: { isWithdrawal: boolean }) {
  return (
    <View
      style={[
        styles.iconWrap,
        isWithdrawal ? styles.iconWrapWithdrawal : styles.iconWrapDeposit,
      ]}>
      <SymbolView
        name={
          isWithdrawal
            ? { ios: 'arrow.down', android: 'arrow_downward' }
            : { ios: 'arrow.up', android: 'arrow_upward' }
        }
        size={20}
        tintColor={
          isWithdrawal ? SAVINGS_ACTIVITY_AMOUNT_WITHDRAWAL : SAVINGS_ACTIVITY_AMOUNT_DEPOSIT
        }
        resizeMode="scaleAspectFit"
      />
    </View>
  );
}

export type SavingsActivityRowProps = {
  item: RecentSavingsActivityItem;
  onPress?: () => void;
  showSeparator?: boolean;
};

export function SavingsActivityRow({ item, onPress, showSeparator = false }: SavingsActivityRowProps) {
  const isWithdrawal = item.type === 'withdrawal';
  const amountLabel = formatIlsExact(agorotToIls(item.amountAgorot));
  const dateLabel = formatSavingsActivityDateLabel(item.createdAt);
  const signPrefix = isWithdrawal ? '−' : '+';

  const handlePress =
    onPress ??
    (() => {
      router.push(`/dream/${item.dreamId}` as Href);
    });

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`${item.dreamTitle}, ${formatRecentSavingsActivityDate(item.createdAt)}`}
        onPress={handlePress}>
        <View style={styles.zoneLeft}>
          <ActivityTypeIcon isWithdrawal={isWithdrawal} />
          <Text
            style={[
              styles.amount,
              isWithdrawal ? styles.amountWithdrawal : styles.amountDeposit,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {signPrefix}
            {'\u200E'}
            {amountLabel}
          </Text>
        </View>

        <View style={styles.zoneCenter}>
          <Text style={styles.date} numberOfLines={2}>
            {dateLabel}
          </Text>
        </View>

        <View style={styles.zoneRight}>
          <Text style={styles.dreamTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.dreamTitle}
          </Text>
          {item.note ? (
            <Text style={styles.note} numberOfLines={2} ellipsizeMode="tail">
              {item.note}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {showSeparator ? <View style={styles.separator} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
    minHeight: 56,
  },
  rowPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    direction: 'ltr',
  },
  iconWrapDeposit: {
    backgroundColor: 'rgba(80, 200, 179, 0.16)',
  },
  iconWrapWithdrawal: {
    backgroundColor: 'rgba(246, 173, 102, 0.18)',
  },
  zoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
    maxWidth: '38%',
  },
  zoneCenter: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 72,
    maxWidth: 108,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: 2,
  },
  zoneRight: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  dreamTitle: {
    ...typography.body,
    fontWeight: '700',
    textAlign: 'right',
    color: colors.text,
    alignSelf: 'stretch',
  },
  date: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    color: colors.textMuted,
  },
  note: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
    alignSelf: 'stretch',
    opacity: 0.92,
  },
  amount: {
    ...typography.stat,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'left',
  },
  amountDeposit: {
    color: SAVINGS_ACTIVITY_AMOUNT_DEPOSIT,
  },
  amountWithdrawal: {
    color: SAVINGS_ACTIVITY_AMOUNT_WITHDRAWAL,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(38, 51, 75, 0.1)',
    marginHorizontal: 2,
  },
});
