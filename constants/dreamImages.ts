import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled dream images — static requires for Metro (no dynamic paths).
 * Gallery picks will use DreamVisual type `uri` separately.
 */
export const dreamImageAssets = {
  car: require('../assets/images/dreams/car.png'),
  vacation: require('../assets/images/dreams/vacation.png'),
  computer: require('../assets/images/dreams/computer.png'),
  house: require('../assets/images/dreams/house.png'),
} as const satisfies Record<string, ImageSourcePropType>;

export type DreamImageAssetKey = keyof typeof dreamImageAssets;
