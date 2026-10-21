import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getDatabase } from '@/database/client';
import {
  getDreamById,
  getSavedAmountForDream,
  listTransactionsByDream,
} from '@/database';
import {
  mapDreamRecordToDream,
  mapTransactionToSavingsEntry,
} from '@/utils/dreamPresenters';
import type { Dream } from '@/types/dream';
import type { SavingsEntry } from '@/types/savings';

export type DreamDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_found' }
  | { status: 'ready'; dream: Dream; history: SavingsEntry[] };

export function useDreamDetail(dreamId: string | undefined) {
  const [state, setState] = useState<DreamDetailState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    if (!dreamId) {
      setState({ status: 'not_found' });
      return;
    }

    setState({ status: 'loading' });
    try {
      const db = await getDatabase();
      const record = await getDreamById(db, dreamId);
      if (!record) {
        setState({ status: 'not_found' });
        return;
      }

      const savedAgorot = await getSavedAmountForDream(db, dreamId);
      const dream = mapDreamRecordToDream(record, savedAgorot);

      let history: SavingsEntry[] = [];
      try {
        const txs = await listTransactionsByDream(db, dreamId);
        history = txs.map(mapTransactionToSavingsEntry);
      } catch {
        history = [];
      }

      setState({ status: 'ready', dream, history });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'טעינת החלום נכשלה',
      });
    }
  }, [dreamId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { state, refresh };
}
