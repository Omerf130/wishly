import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getDatabase } from '@/database/client';
import { getSavedAmountForDream, listDreams } from '@/database';
import { mapDreamRecordToDream } from '@/utils/dreamPresenters';
import type { Dream } from '@/types/dream';

export function useDreamsList() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const db = await getDatabase();
      const records = await listDreams(db);
      const visible = records.filter((record) => record.status !== 'archived');

      const mapped = await Promise.all(
        visible.map(async (record) => {
          const savedAgorot = await getSavedAmountForDream(db, record.id);
          return mapDreamRecordToDream(record, savedAgorot);
        }),
      );

      setDreams(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'טעינת החלומות נכשלה');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void refresh();
    }, [refresh]),
  );

  return { dreams, loading, error, refresh };
}
