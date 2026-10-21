import { mockDreams } from '@/data/mockDreams';
import type { Dream } from '@/types/dream';

export function getDreamById(id: string): Dream | undefined {
  return mockDreams.find((dream) => dream.id === id);
}
