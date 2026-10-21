import {
  getBuiltInDreamImageOption,
  isBuiltInDreamImageKey,
  parseDreamAccent,
} from '@/constants/builtInDreamImages';
import type { DreamImageAssetKey } from '@/constants/dreamImages';
import { agorotToIls } from '@/database/money';
import type { DreamRecord, SavingsTransactionRecord } from '@/types/database';
import type { Dream } from '@/types/dream';
import type { SavingsEntry } from '@/types/savings';

function resolveAssetKey(imageReference: string): DreamImageAssetKey {
  if (isBuiltInDreamImageKey(imageReference)) {
    return imageReference;
  }
  return 'car';
}

export function mapDreamRecordToDream(
  record: DreamRecord,
  savedAmountAgorot: number,
): Dream {
  const meta = getBuiltInDreamImageOption(record.imageReference);
  const assetKey = resolveAssetKey(record.imageReference);
  const accent = parseDreamAccent(record.accentColor);

  return {
    id: record.id,
    title: record.title,
    subtitle: record.description ?? undefined,
    savedAmount: agorotToIls(savedAmountAgorot),
    targetAmount: agorotToIls(record.targetAmount),
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
    note: tx.note ?? undefined,
  };
}
