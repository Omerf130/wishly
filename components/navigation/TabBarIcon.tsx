import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import { ColorValue, StyleSheet, View } from 'react-native';

type TabBarIconProps = {
  ios: SFSymbol;
  android: 'settings' | 'pie_chart' | 'calendar_month' | 'favorite';
  color: ColorValue;
  focused: boolean;
};

export function TabBarIcon({ ios, android, color, focused }: TabBarIconProps) {
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <SymbolView
        name={{ ios, android }}
        size={26}
        tintColor={color}
        resizeMode="scaleAspectFit"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  wrapFocused: {
    backgroundColor: 'rgba(118, 86, 232, 0.12)',
  },
});
