import { Image, StyleSheet, Text, View } from 'react-native';

import { ImageBottomGradient } from '@/components/ui/ImageBottomGradient';
import { dreamImageAssets } from '@/constants/dreamImages';
import { colors, typography } from '@/constants/theme';
import type { DreamVisual } from '@/types/dream';

type DreamCardMediaProps = {
  title: string;
  visual: DreamVisual;
  accentColor: string;
};

function resolveImageSource(visual: DreamVisual) {
  if (visual.type === 'asset') {
    return dreamImageAssets[visual.assetKey];
  }
  if (visual.type === 'uri') {
    return { uri: visual.uri };
  }
  return null;
}

/**
 * Image / placeholder area — base layer for future reveal (grayscale + color overlay).
 */
export function DreamCardMedia({ title, visual, accentColor }: DreamCardMediaProps) {
  const imageSource = resolveImageSource(visual);
  const hasPhoto = imageSource != null;

  return (
    <View style={styles.media}>
      <View style={styles.mediaInner}>
        {hasPhoto ? (
          <>
            <Image source={imageSource} style={styles.image} resizeMode="cover" />
            <View style={styles.revealSlot} pointerEvents="none" />
          </>
        ) : visual.type === 'placeholder' ? (
          <View style={[styles.placeholder, { backgroundColor: visual.backgroundColor }]}>
            <View style={[styles.blobPrimary, { backgroundColor: visual.accentColor }]} />
            <View style={[styles.blobSecondary, { backgroundColor: visual.accentColor }]} />
            <View style={styles.revealSlot} />
          </View>
        ) : null}
        <ImageBottomGradient />
        <View style={styles.titleRow}>
          <View style={[styles.iconBadge, { borderColor: accentColor }]}>
            <Text style={[styles.iconGlyph, { color: accentColor }]}>{visual.iconGlyph}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  mediaInner: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    overflow: 'hidden',
  },
  blobPrimary: {
    position: 'absolute',
    width: '72%',
    height: '78%',
    borderRadius: 999,
    opacity: 0.2,
    top: '-12%',
    right: '-18%',
  },
  blobSecondary: {
    position: 'absolute',
    width: '48%',
    height: '52%',
    borderRadius: 999,
    opacity: 0.16,
    bottom: '-8%',
    left: '-10%',
  },
  revealSlot: {
    ...StyleSheet.absoluteFill,
  },
  titleRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    ...typography.cardTitle,
    color: colors.white,
    flexShrink: 1,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
