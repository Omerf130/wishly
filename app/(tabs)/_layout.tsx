import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { colors } from '@/constants/theme';

const TAB_BODY_HEIGHT = 58;
const WARM_INACTIVE = 'rgba(38, 51, 75, 0.52)';

function TabBarBackground() {
  return (
    <View style={styles.tabBarBackground}>
      <View style={styles.tabBarShadowLine} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const tabBarPaddingTop = 10;
  const tabBarHeight = TAB_BODY_HEIGHT + tabBarPaddingTop + bottomInset;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: WARM_INACTIVE,
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: {
          ...styles.tabBar,
          height: tabBarHeight,
          paddingTop: tabBarPaddingTop,
          paddingBottom: bottomInset,
        },
        tabBarBackground: () => <TabBarBackground />,
      }}>
      {/* Physical left → right (LTR tab bar) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon ios="gearshape.fill" android="settings" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'סיכום',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon ios="chart.pie.fill" android="pie_chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'תכנון',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              ios="calendar"
              android="calendar_month"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'החלומות שלי',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon ios="heart.fill" android="favorite" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    direction: 'ltr',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarBackground: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.9,
        shadowRadius: 16,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  tabBarShadowLine: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(38, 51, 75, 0.06)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
    writingDirection: 'rtl',
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 0,
  },
});
