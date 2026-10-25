/** True in React Native dev builds; false in production and in Node (self-checks). */
export function isWishlyDevEnvironment(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}
