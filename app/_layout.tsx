import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DatabaseGate } from '@/components/database/DatabaseGate';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <DatabaseGate>
        <View style={styles.root}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="dream/create" options={{ headerShown: false }} />
            <Stack.Screen name="dream/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="dev/sqlite-test" options={{ headerShown: false }} />
            <Stack.Screen name="dev/keyboard-test" options={{ headerShown: false }} />
          </Stack>
        </View>
      </DatabaseGate>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    direction: 'rtl',
    backgroundColor: colors.background,
  },
});
