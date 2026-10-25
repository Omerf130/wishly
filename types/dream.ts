import type { DreamImageAssetKey } from '@/constants/dreamImages';

import type { AppColors } from '@/constants/theme/colors';

export type DreamAccent = keyof Pick<
  AppColors,
  'primary' | 'mint' | 'peach' | 'pink'
>;

export type DreamVisual =
  | {
      type: 'placeholder';
      backgroundColor: string;
      accentColor: string;
      iconGlyph: string;
    }
  | {
      type: 'asset';
      assetKey: DreamImageAssetKey;
      iconGlyph: string;
    }
  | {
      /** User-selected image from device gallery (future). */
      type: 'uri';
      uri: string;
      iconGlyph: string;
    };

export type Dream = {
  id: string;
  title: string;
  subtitle?: string;
  savedAmount: number;
  targetAmount: number;
  /** Optional monthly plan in whole ILS units (from agorot). */
  monthlySavingsAmount: number | null;
  /** Local calendar date YYYY-MM-DD. */
  targetDate: string | null;
  accent: DreamAccent;
  visual: DreamVisual;
};
