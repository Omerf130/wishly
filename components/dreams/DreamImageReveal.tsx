import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ImageSourcePropType,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type ImageStyle,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, typography } from '@/constants/theme';

export type RevealDirection = 'physical-start' | 'physical-end';

type DreamImageRevealProps = {
  source: ImageSourcePropType;
  progress: number;
  aspectRatio?: number;
  borderRadius?: number;
  revealDirection?: RevealDirection;
  accentColor?: string;
  showProgressBadge?: boolean;
};

const REVEAL_ANIMATION_MS = 950;

const clampProgress = (value: number) => Math.min(100, Math.max(0, value));

/** Bottom layer only — visible in unrevealed regions; color clip stays unchanged above. */
function GrayscaleImageLayer({
  source,
  width,
  height,
  resizeMode,
  onError,
}: {
  source: ImageSourcePropType;
  width: number;
  height: number;
  resizeMode: ImageResizeMode;
  onError?: () => void;
}) {
  const webGrayStyle =
    Platform.OS === 'web'
      ? ({ filter: 'grayscale(1) brightness(0.72)' } as ImageStyle)
      : undefined;

  return (
    <View style={{ width, height }}>
      <Image
        source={source}
        style={[{ width, height }, webGrayStyle]}
        resizeMode={resizeMode}
        onError={onError}
      />
      {Platform.OS !== 'web' ? (
        <>
          <View style={[StyleSheet.absoluteFill, styles.desaturateOverlay]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.colorizeGrayOverlay]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.luminosityOverlay]} pointerEvents="none" />
          <View style={[StyleSheet.absoluteFill, styles.darkenOverlay]} pointerEvents="none" />
        </>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.webDarkenOverlay]} pointerEvents="none" />
      )}
    </View>
  );
}

export function DreamImageReveal({
  source,
  progress,
  aspectRatio = 4 / 3,
  borderRadius = 24,
  revealDirection = 'physical-start',
  accentColor = colors.primary,
  showProgressBadge = true,
}: DreamImageRevealProps) {
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [badgePercent, setBadgePercent] = useState(() => Math.round(clampProgress(progress)));

  const progressSv = useSharedValue(clampProgress(progress));
  const skipNextAnimationRef = useRef(true);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [source]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled: boolean) => {
        setReduceMotion(enabled);
      },
    );

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  useAnimatedReaction(
    () => progressSv.value,
    (value) => {
      runOnJS(setBadgePercent)(Math.round(value));
    },
    [progressSv],
  );

  useEffect(() => {
    const next = clampProgress(progress);

    if (skipNextAnimationRef.current) {
      progressSv.value = next;
      setBadgePercent(Math.round(next));
      skipNextAnimationRef.current = false;
      return;
    }

    if (reduceMotion) {
      progressSv.value = next;
      setBadgePercent(Math.round(next));
      return;
    }

    progressSv.value = withTiming(next, {
      duration: REVEAL_ANIMATION_MS,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [progress, progressSv, reduceMotion]);

  const onLayout = (event: LayoutChangeEvent) => {
    setLayoutWidth(event.nativeEvent.layout.width);
  };

  const clipStyle = useAnimatedStyle(() => {
    const width = layoutWidth * (progressSv.value / 100);
    return { width };
  }, [layoutWidth]);

  const anchorRight = revealDirection === 'physical-start';
  const imageHeight = layoutWidth > 0 ? layoutWidth / aspectRatio : 0;
  const onImageError = () => setImageLoadFailed(true);

  return (
    <View
      style={[styles.frame, { aspectRatio, borderRadius }]}
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={`תמונת חלום, ${badgePercent} אחוז נחשפו בצבע`}>
      {imageLoadFailed ? (
        <View style={styles.missingImage}>
          <Text style={styles.missingImageText}>תמונה לא זמינה</Text>
        </View>
      ) : layoutWidth > 0 ? (
        <>
          <GrayscaleImageLayer
            source={source}
            width={layoutWidth}
            height={imageHeight}
            resizeMode="cover"
            onError={onImageError}
          />

          <Animated.View
            style={[
              styles.colorClip,
              anchorRight ? styles.clipAnchorRight : styles.clipAnchorLeft,
              clipStyle,
            ]}>
            <Image
              source={source}
              style={[
                {
                  width: layoutWidth,
                  height: imageHeight,
                },
                anchorRight ? styles.imageAnchorRight : styles.imageAnchorLeft,
              ]}
              resizeMode="cover"
              onError={onImageError}
            />
            <View
              style={[
                styles.divider,
                anchorRight ? styles.dividerOnClipLeft : styles.dividerOnClipRight,
              ]}
            />
          </Animated.View>
        </>
      ) : null}

      {showProgressBadge ? (
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{badgePercent}%</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#CBD5E1',
    position: 'relative',
  },
  colorClip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  clipAnchorRight: {
    right: 0,
  },
  clipAnchorLeft: {
    left: 0,
  },
  imageAnchorRight: {
    position: 'absolute',
    right: 0,
  },
  imageAnchorLeft: {
    position: 'absolute',
    left: 0,
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dividerOnClipLeft: {
    left: 0,
  },
  dividerOnClipRight: {
    right: 0,
  },
  desaturateOverlay: {
    backgroundColor: '#334155',
    mixBlendMode: 'saturation',
  },
  colorizeGrayOverlay: {
    backgroundColor: 'rgba(71, 85, 105, 0.55)',
    mixBlendMode: 'color',
  },
  luminosityOverlay: {
    backgroundColor: 'rgba(30, 41, 59, 0.28)',
    mixBlendMode: 'luminosity',
  },
  darkenOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  webDarkenOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    ...typography.button,
    fontSize: 14,
    color: colors.white,
  },
  missingImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  missingImageText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
