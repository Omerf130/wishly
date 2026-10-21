import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DreamDetailHeader } from '@/components/dreams/DreamDetailHeader';
import { DreamImageReveal } from '@/components/dreams/DreamImageReveal';
import { DreamSavingsInfoCard } from '@/components/dreams/DreamSavingsInfoCard';
import { RevealDevControls } from '@/components/dreams/RevealDevControls';
import { colors, typography } from '@/constants/theme';
import { useDreamDetail } from '@/hooks/useDreamDetail';
import { dreamProgressPercent } from '@/utils/formatCurrency';
import { resolveDreamImageSource } from '@/utils/resolveDreamImageSource';

export default function DreamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useDreamDetail(id);
  const [previewProgress, setPreviewProgress] = useState<number | null>(null);

  if (state.status === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>לא ניתן לטעון את החלום</Text>
          <Text style={styles.errorBody}>{state.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.errorButton, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaLabel}>חזרה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (state.status === 'not_found') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.errorWrap}>
          <Text style={styles.errorTitle}>החלום לא נמצא</Text>
          <Text style={styles.errorBody}>ייתכן שהקישור לא מעודכן או שהחלום הוסר.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.errorButton, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaLabel}>חזרה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dream = state.dream;
  const history = state.history;
  const accentColor = colors[dream.accent];
  const actualProgress = dreamProgressPercent(dream.savedAmount, dream.targetAmount);
  const revealProgress = previewProgress ?? actualProgress;
  const imageSource = resolveDreamImageSource(dream.visual);

  const onAddSavings = () => {
    Alert.alert('בקרוב', 'הוספת חיסכון תתווסף בשלב הבא.', [{ text: 'הבנתי' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        directionalLockEnabled>
        <DreamDetailHeader
          title={dream.title}
          iconGlyph={dream.visual.iconGlyph}
          accentColor={accentColor}
          onBack={() => router.back()}
        />

        <View style={styles.heroBlock}>
          {imageSource ? (
            <DreamImageReveal
              source={imageSource}
              progress={revealProgress}
              aspectRatio={4 / 3}
              borderRadius={24}
              revealDirection="physical-start"
              accentColor={accentColor}
            />
          ) : (
            <View style={styles.noImage}>
              <Text style={styles.noImageText}>אין תמונה לחלום זה</Text>
            </View>
          )}

          <View style={styles.cardOverlap}>
            <DreamSavingsInfoCard
              title={dream.title}
              subtitle={dream.subtitle}
              iconGlyph={dream.visual.iconGlyph}
              accentColor={accentColor}
              savedAmount={dream.savedAmount}
              targetAmount={dream.targetAmount}
              progressPercent={actualProgress}
              historyEntries={history}
              onAddSavings={onAddSavings}
              isLiveHistory
            />
          </View>
        </View>

        <RevealDevControls
          previewProgress={previewProgress ?? actualProgress}
          onSelect={(value) => setPreviewProgress(value)}
          onReset={() => setPreviewProgress(null)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBlock: {
    position: 'relative',
  },
  cardOverlap: {
    marginTop: -36,
    zIndex: 2,
  },
  ctaPressed: {
    backgroundColor: colors.primaryPressed,
    transform: [{ scale: 0.99 }],
  },
  ctaLabel: {
    ...typography.button,
  },
  noImage: {
    aspectRatio: 4 / 3,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    ...typography.body,
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBody: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
});
