import type { DreamImageAssetKey } from '@/constants/dreamImages';
import type { DreamAccent } from '@/types/dream';

export type BuiltInDreamImageOption = {
  id: DreamImageAssetKey;
  label: string;
  accent: DreamAccent;
  iconGlyph: string;
};

/** Stable IDs persisted in SQLite `image_reference` for built-in assets. */
export const builtInDreamImageOptions: BuiltInDreamImageOption[] = [
  { id: 'car', label: 'רכב', accent: 'primary', iconGlyph: '◆' },
  { id: 'vacation', label: 'חופשה', accent: 'mint', iconGlyph: '✦' },
  { id: 'computer', label: 'מחשב', accent: 'peach', iconGlyph: '▣' },
  { id: 'house', label: 'בית', accent: 'pink', iconGlyph: '⌂' },
];

const optionById = Object.fromEntries(
  builtInDreamImageOptions.map((option) => [option.id, option]),
) as Record<DreamImageAssetKey, BuiltInDreamImageOption>;

export function getBuiltInDreamImageOption(
  imageReference: string,
): BuiltInDreamImageOption | undefined {
  if (imageReference in optionById) {
    return optionById[imageReference as DreamImageAssetKey];
  }
  return undefined;
}

export function isBuiltInDreamImageKey(value: string): value is DreamImageAssetKey {
  return value in optionById;
}

export function parseDreamAccent(value: string): DreamAccent {
  if (value === 'primary' || value === 'mint' || value === 'peach' || value === 'pink') {
    return value;
  }
  return 'primary';
}
