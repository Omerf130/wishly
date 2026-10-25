import {
  getBuiltInDreamImageOption,
  parseDreamAccent,
} from '@/constants/builtInDreamImages';
import {
  LOCAL_DREAM_IMAGE_ACCENT,
  LOCAL_DREAM_IMAGE_ICON,
} from '@/constants/localDreamImage';
import { agorotToIls } from '@/database/money';
import type { DreamRecord, SavingsTransactionRecord } from '@/types/database';
import type { Dream } from '@/types/dream';
import type { SavingsEntry } from '@/types/savings';
import { resolveRelativeDreamImageUri } from '@/utils/dreamLocalImages';

export function mapDreamRecordToDream(
  record: DreamRecord,
  savedAmountAgorot: number,
): Dream {
  const accent = parseDreamAccent(record.accentColor);

  if (record.imageType === 'local') {
    return {
      id: record.id,
      title: record.title,
      subtitle: record.description ?? undefined,
      savedAmount: agorotToIls(savedAmountAgorot),
      targetAmount: agorotToIls(record.targetAmount),
      monthlySavingsAmount:
        record.monthlySavingsAgorot != null ? agorotToIls(record.monthlySavingsAgorot) : null,
      targetDate: record.targetDate,
      accent: accent === 'primary' ? LOCAL_DREAM_IMAGE_ACCENT : accent,
      visual: {
        type: 'uri',
        uri: resolveRelativeDreamImageUri(record.imageReference),
        iconGlyph: LOCAL_DREAM_IMAGE_ICON,
      },
    };
  }

  const meta = getBuiltInDreamImageOption(record.imageReference);
  const assetKey = meta?.id ?? 'car';

  return {
    id: record.id,
    title: record.title,
    subtitle: record.description ?? undefined,
    savedAmount: agorotToIls(savedAmountAgorot),
    targetAmount: agorotToIls(record.targetAmount),
    monthlySavingsAmount:
      record.monthlySavingsAgorot != null ? agorotToIls(record.monthlySavingsAgorot) : null,
    targetDate: record.targetDate,
    accent: meta?.accent ?? accent,
    visual: {
      type: 'asset',
      assetKey,
      iconGlyph: meta?.iconGlyph ?? '◆',
    },
  };
}

export function mapTransactionToSavingsEntry(tx: SavingsTransactionRecord): SavingsEntry {
  const date = new Date(tx.createdAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? tx.createdAt
    : date.toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const isWithdrawal = tx.type === 'withdrawal';
  const actionLabel = isWithdrawal ? 'משיכה' : 'הפקדה';

  return {
    id: tx.id,
    dateLabel,
    amount: agorotToIls(tx.amount),
    actionLabel,
    kind: isWithdrawal ? 'withdrawal' : 'deposit',
    note: tx.note ?? undefined,
  };
}
