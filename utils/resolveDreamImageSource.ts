import type { ImageSourcePropType } from 'react-native';

import { dreamImageAssets } from '@/constants/dreamImages';
import type { DreamVisual } from '@/types/dream';

export function resolveDreamImageSource(visual: DreamVisual): ImageSourcePropType | null {
  if (visual.type === 'asset') {
    return dreamImageAssets[visual.assetKey];
  }
  if (visual.type === 'uri') {
    return { uri: visual.uri };
  }
  return null;
}
