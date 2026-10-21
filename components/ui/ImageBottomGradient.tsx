import { StyleSheet, View } from 'react-native';

/** Faux gradient for readable text over images — no extra dependencies. */
export function ImageBottomGradient() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.layer, styles.layerSoft]} />
      <View style={[styles.layer, styles.layerMid]} />
      <View style={[styles.layer, styles.layerStrong]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  layerSoft: {
    height: '50%',
    backgroundColor: 'rgba(38, 51, 75, 0.08)',
  },
  layerMid: {
    height: '36%',
    backgroundColor: 'rgba(38, 51, 75, 0.28)',
  },
  layerStrong: {
    height: '24%',
    backgroundColor: 'rgba(38, 51, 75, 0.52)',
  },
});
