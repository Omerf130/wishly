import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

export function WelcomeDecor() {
  return (
    <View style={styles.wrapper} accessibilityElementsHidden importantForAccessibility="no">
      <View style={[styles.blob, styles.blobPurple]} />
      <View style={[styles.blob, styles.blobMint]} />
      <View style={[styles.blob, styles.blobPeach]} />
      <View style={[styles.blob, styles.blobPink]} />
      <View style={styles.centerRing}>
        <View style={styles.centerDot} />
      </View>
    </View>
  );
}

const BLOB_SIZE = 88;

const styles = StyleSheet.create({
  wrapper: {
    width: 240,
    height: 200,
    alignSelf: 'center',
    marginVertical: 28,
  },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
    opacity: 0.92,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 6,
  },
  blobPurple: {
    backgroundColor: colors.primary,
    top: 8,
    right: 24,
  },
  blobMint: {
    backgroundColor: colors.mint,
    top: 52,
    left: 8,
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  blobPeach: {
    backgroundColor: colors.peach,
    bottom: 12,
    right: 4,
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  blobPink: {
    backgroundColor: colors.pink,
    bottom: 28,
    left: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  centerRing: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: 'rgba(255, 247, 236, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  centerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
});
