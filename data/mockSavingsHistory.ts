import type { SavingsEntry } from '@/types/savings';

/** Demo deposits — sums match mockDreams savedAmount per dream id. */
export const mockSavingsHistoryByDreamId: Record<string, SavingsEntry[]> = {
  car: [
    {
      id: 'car-1',
      dateLabel: '15 בינואר 2026',
      amount: 5_000,
      actionLabel: 'הפקדה',
      kind: 'deposit',
      note: 'הפקדה ראשונה',
    },
    { id: 'car-2', dateLabel: '3 במרץ 2026', amount: 8_000, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'car-3', dateLabel: '12 באפריל 2026', amount: 12_000, actionLabel: 'הפקדה', kind: 'deposit' },
  ],
  thailand: [
    { id: 'th-1', dateLabel: '20 בפברואר 2026', amount: 4_000, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'th-2', dateLabel: '8 במאי 2026', amount: 6_000, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'th-3', dateLabel: '1 ביוני 2026', amount: 6_000, actionLabel: 'הפקדה', kind: 'deposit' },
  ],
  laptop: [
    { id: 'pc-1', dateLabel: '10 במרץ 2026', amount: 2_200, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'pc-2', dateLabel: '22 במאי 2026', amount: 2_500, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'pc-3', dateLabel: '5 ביולי 2026', amount: 2_500, actionLabel: 'הפקדה', kind: 'deposit' },
  ],
  house: [
    {
      id: 'house-1',
      dateLabel: '1 בינואר 2026',
      amount: 50_000,
      actionLabel: 'הפקדה',
      kind: 'deposit',
      note: 'קרן פתיחה',
    },
    { id: 'house-2', dateLabel: '18 במרץ 2026', amount: 40_000, actionLabel: 'הפקדה', kind: 'deposit' },
    { id: 'house-3', dateLabel: '30 ביוני 2026', amount: 60_000, actionLabel: 'הפקדה', kind: 'deposit' },
  ],
};
