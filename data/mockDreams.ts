import type { Dream } from '@/types/dream';

export const mockDreams: Dream[] = [
  {
    id: 'car',
    title: 'הרכב שלי',
    savedAmount: 25_000,
    targetAmount: 100_000,
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
    savedAmount: 16_000,
    targetAmount: 40_000,
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
    savedAmount: 7_200,
    targetAmount: 12_000,
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
    savedAmount: 150_000,
    targetAmount: 1_500_000,
    accent: 'pink',
    visual: {
      type: 'asset',
      assetKey: 'house',
      iconGlyph: '⌂',
    },
  },
];
