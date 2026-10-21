import { Platform, TextStyle } from 'react-native';

import { colors } from './colors';

const baseText: TextStyle = {
  color: colors.text,
  writingDirection: 'rtl',
};

export const typography = {
  brand: {
    ...baseText,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'ios' ? 0.5 : 0,
    color: colors.primary,
  },
  headline: {
    ...baseText,
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 34,
  },
  body: {
    ...baseText,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
    color: colors.textMuted,
  },
  button: {
    ...baseText,
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  caption: {
    ...baseText,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: colors.textMuted,
  },
  screenTitle: {
    ...baseText,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 40,
  },
  cardTitle: {
    ...baseText,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  stat: {
    ...baseText,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
} as const satisfies Record<string, TextStyle>;
