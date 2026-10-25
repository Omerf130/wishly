import { type Href, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { DreamGoalCelebration } from '@/components/dreams/DreamGoalCelebration';
import { DreamImageReveal } from '@/components/dreams/DreamImageReveal';
import { DreamSavingsInfoCard } from '@/components/dreams/DreamSavingsInfoCard';
import { RevealDevControls } from '@/components/dreams/RevealDevControls';
import { colors, typography } from '@/constants/theme';
import { getDatabase } from '@/database/client';
import { deleteDreamWithLocalImageCleanup } from '@/database';
import { DatabaseError, NotFoundError } from '@/database/errors';
import { useDreamDetail } from '@/hooks/useDreamDetail';
import { dreamProgressPercent } from '@/utils/formatCurrency';
import { consumePendingGoalCelebration } from '@/utils/pendingGoalCelebration';
import { resolveDreamImageSource } from '@/utils/resolveDreamImageSource';

export default function DreamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useDreamDetail(id);
  const [previewProgress, setPreviewProgress] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [awaitingGoalCelebration, setAwaitingGoalCelebration] = useState(false);
  const [goalCelebrationVisible, setGoalCelebrationVisible] = useState(false);
  const deletingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        return;
      }
      if (consumePendingGoalCelebration(id)) {
        setAwaitingGoalCelebration(true);
      }
    }, [id]),
  );

  const onRevealProgressSettled = useCallback(() => {
    setAwaitingGoalCelebration((awaiting) => {
      if (awaiting) {
        setGoalCelebrationVisible(true);
        return false;
      }
      return awaiting;
    });
  }, []);

  const readyDream = state.status === 'ready' ? state.dream : null;
  const readyImageSource = readyDream
    ? resolveDreamImageSource(readyDream.visual)
    : null;

  useEffect(() => {
    if (!awaitingGoalCelebration || !readyDream) {
      return;
    }
    if (!readyImageSource) {
      setAwaitingGoalCelebration(false);
      setGoalCelebrationVisible(true);
    }
  }, [awaitingGoalCelebration, readyDream, readyImageSource]);

  const performDeleteDream = useCallback(async () => {
    if (!id || deletingRef.current) {
      return;
    }

    deletingRef.current = true;
    setDeleting(true);

    try {
      const db = await getDatabase();
      await deleteDreamWithLocalImageCleanup(db, id);
      router.replace('/home' as Href);
    } catch (error) {
      const message =
        error instanceof NotFoundError
          ? 'החלום לא נמצא — ייתכן שכבר נמחק'
          : error instanceof DatabaseError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'מחיקת החלום נכשלה';
      Alert.alert('לא ניתן למחוק', message, [{ text: 'הבנתי' }]);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [id, router]);

  const onPressDeleteDream = useCallback(
    (dreamTitle: string) => {
      if (deletingRef.current) {
        return;
      }

      Alert.alert(
        'מחיקת חלום',
        `האם למחוק את החלום '${dreamTitle}'?\n\nהמחיקה תסיר לצמיתות את החלום ואת היסטוריית החיסכון שלו מהמכשיר. לא ניתן לבטל פעולה זו.`,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'מחק חלום',
            style: 'destructive',
            onPress: () => {
              void performDeleteDream();
            },
          },
        ],
      );
    },
    [performDeleteDream],
  );

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
    router.push(`/dream/savings-action?id=${dream.id}` as Href);
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="עריכת חלום"
          onPress={() => router.push(`/dream/edit?id=${dream.id}` as Href)}
          style={({ pressed }) => [styles.editDreamButton, pressed && styles.editDreamPressed]}>
          <Text style={styles.editDreamIcon}>✎</Text>
          <Text style={styles.editDreamLabel}>עריכת חלום</Text>
        </Pressable>

        <View style={styles.heroBlock}>
          {imageSource ? (
            <DreamImageReveal
              source={imageSource}
              progress={revealProgress}
              aspectRatio={4 / 3}
              borderRadius={24}
              revealDirection="physical-start"
              accentColor={accentColor}
              onRevealProgressSettled={onRevealProgressSettled}
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
              monthlySavingsAmount={dream.monthlySavingsAmount}
              targetDate={dream.targetDate}
            />
          </View>
        </View>

        <RevealDevControls
          previewProgress={previewProgress ?? actualProgress}
          onSelect={(value) => setPreviewProgress(value)}
          onReset={() => setPreviewProgress(null)}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="מחיקת חלום"
          disabled={deleting}
          onPress={() => onPressDeleteDream(dream.title)}
          style={({ pressed }) => [
            styles.deleteDreamButton,
            deleting && styles.deleteDreamButtonDisabled,
            pressed && !deleting && styles.deleteDreamPressed,
          ]}>
          {deleting ? (
            <ActivityIndicator color={colors.pink} size="small" />
          ) : (
            <>
              <Text style={styles.deleteDreamIcon}>🗑</Text>
              <Text style={styles.deleteDreamLabel}>מחיקת חלום</Text>
            </>
          )}
        </Pressable>
      </ScrollView>

      <DreamGoalCelebration
        visible={goalCelebrationVisible}
        dreamTitle={dream.title}
        onContinue={() => setGoalCelebrationVisible(false)}
      />
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
  deleteDreamButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(237, 134, 165, 0.45)',
    backgroundColor: 'rgba(237, 134, 165, 0.08)',
  },
  deleteDreamButtonDisabled: {
    opacity: 0.7,
  },
  deleteDreamPressed: {
    opacity: 0.92,
  },
  deleteDreamIcon: {
    fontSize: 16,
  },
  deleteDreamLabel: {
    ...typography.stat,
    color: colors.pink,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editDreamButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.2)',
  },
  editDreamPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  editDreamIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  editDreamLabel: {
    ...typography.stat,
    color: colors.primary,
    fontWeight: '700',
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
