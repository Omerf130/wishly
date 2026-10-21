import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WelcomeDecor } from '@/components/WelcomeDecor';
import { colors, typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const [pressed, setPressed] = useState(false);

  const onStartPress = () => {
    Alert.alert(
      'בקרוב',
      'הכפתור יוביל לשלב הבא בפיתוח — הרשמה, חלומות וחיסכון. בשלב CP1 זה מסך פתיחה בלבד.',
      [{ text: 'הבנתי' }],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.brand} accessibilityRole="header">
            Wishly
          </Text>
          <Text style={styles.headline}>החלומות שלך מתחילים כאן</Text>
          <Text style={styles.body}>
            חוסכים בקצב שלך, ורואים כל חלום מתקרב למציאות.
          </Text>

          <WelcomeDecor />

          <Pressable
            accessibilityRole="button"
            accessibilityHint="יופעל בשלב הבא של הפיתוח"
            onPress={onStartPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={({ pressed: isPressed }) => [
              styles.button,
              (isPressed || pressed) && styles.buttonPressed,
            ]}>
            <Text style={styles.buttonLabel}>בואו נתחיל</Text>
          </Pressable>

          <Text style={styles.hint}>המסך הבא יתווסף ב-CP2</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    ...typography.brand,
    textAlign: 'center',
    marginBottom: 12,
  },
  headline: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    ...typography.button,
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: 16,
  },
});
