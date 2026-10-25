import type { Dream } from '@/types/dream';

export const mockDreams: Dream[] = [
  {
    id: 'car',
    title: 'הרכב שלי',
    subtitle: 'חופש תנועה בקצב שלך',
    savedAmount: 25_000,
    targetAmount: 100_000,
    monthlySavingsAmount: null,
    targetDate: null,
    accent: 'primary',
    visual: {
      type: 'asset',
      assetKey: 'car',
      iconGlyph: '◆',
    },
  },
  {
    id: 'thailand',
    title: 'חופשה בתאילנד',
    subtitle: 'שקט, שמש וים',
    savedAmount: 16_000,
    targetAmount: 40_000,
    monthlySavingsAmount: null,
    targetDate: null,
    accent: 'mint',
    visual: {
      type: 'asset',
      assetKey: 'vacation',
      iconGlyph: '✦',
    },
  },
  {
    id: 'laptop',
    title: 'מחשב חדש',
    subtitle: 'כוח עבודה חדש ליום-יום',
    savedAmount: 7_200,
    targetAmount: 12_000,
    monthlySavingsAmount: null,
    targetDate: null,
    accent: 'peach',
    visual: {
      type: 'asset',
      assetKey: 'computer',
      iconGlyph: '▣',
    },
  },
  {
    id: 'house',
    title: 'בית החלומות',
    subtitle: 'המקום שתמיד דמיינת',
    savedAmount: 150_000,
    targetAmount: 1_500_000,
    monthlySavingsAmount: null,
    targetDate: null,
    accent: 'pink',
    visual: {
      type: 'asset',
      assetKey: 'house',
      iconGlyph: '⌂',
    },
  },
];
