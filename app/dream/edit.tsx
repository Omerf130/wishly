import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { builtInDreamImageOptions, isBuiltInDreamImageKey } from '@/constants/builtInDreamImages';
import { dreamImageAssets } from '@/constants/dreamImages';
import type { DreamImageAssetKey } from '@/constants/dreamImages';
import {
  LOCAL_DREAM_IMAGE_ACCENT,
  LOCAL_DREAM_IMAGE_LABEL,
} from '@/constants/localDreamImage';
import { colors, typography } from '@/constants/theme';
import { getDatabase } from '@/database/client';
import {
  countDreamsWithLocalImageReference,
  getDreamById,
  updateDream,
} from '@/database';
import { ValidationError } from '@/database/errors';
import {
  agorotToShekelsInputString,
  ilsToAgorot,
} from '@/database/money';
import type { DreamRecord } from '@/types/database';
import {
  copyPickerImageToDreamStore,
  deleteDreamImageFile,
  resolveRelativeDreamImageUri,
} from '@/utils/dreamLocalImages';
import { DreamSavingsPlanFields } from '@/components/dreams/DreamSavingsPlanFields';
import {
  dreamPlanningFormValues,
  validateDreamPlanningForm,
} from '@/utils/dreamPlanningForm';
import { parseShekelsInput } from '@/utils/parseShekelsInput';
import { pickDreamGalleryImage } from '@/utils/pickDreamGalleryImage';

type FormErrors = {
  title?: string;
  image?: string;
  target?: string;
  monthly?: string;
  targetDate?: string;
  general?: string;
};

type KeyboardMetrics = {
  height: number;
  screenY: number;
};

type EditImageChoice =
  | { mode: 'builtIn'; id: DreamImageAssetKey }
  | { mode: 'localExisting'; relativePath: string; previewUri: string }
  | { mode: 'localNew'; previewUri: string };

export default function EditDreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: dreamId } = useLocalSearchParams<{ id: string }>();

  const savingRef = useRef(false);
  const originalRecordRef = useRef<DreamRecord | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetShekels, setTargetShekels] = useState('');
  const [monthlyShekels, setMonthlyShekels] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
  const [imageChoice, setImageChoice] = useState<EditImageChoice | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [keyboardMetrics, setKeyboardMetrics] = useState<KeyboardMetrics | null>(null);

  const keyboardVisible = keyboardMetrics !== null;

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardMetrics({
        height: event.endCoordinates.height,
        screenY: event.endCoordinates.screenY,
      });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardMetrics(null);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollTargetIntoView = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, []);

  useEffect(() => {
    if (keyboardMetrics) {
      scrollTargetIntoView();
    }
  }, [keyboardMetrics, scrollTargetIntoView]);

  useEffect(() => {
    let cancelled = false;

    async function loadDream() {
      if (!dreamId) {
        setLoadError('חסר מזהה חלום');
        setLoading(false);
        return;
      }

      try {
        const db = await getDatabase();
        const record = await getDreamById(db, dreamId);
        if (!record) {
          setLoadError('החלום לא נמצא');
          return;
        }

        if (cancelled) {
          return;
        }

        originalRecordRef.current = record;
        setTitle(record.title);
        setDescription(record.description ?? '');
        setTargetShekels(agorotToShekelsInputString(record.targetAmount));
        setMonthlyShekels(
          record.monthlySavingsAgorot != null
            ? agorotToShekelsInputString(record.monthlySavingsAgorot)
            : '',
        );
        setTargetDateInput(record.targetDate ?? '');

        if (record.imageType === 'builtIn' && isBuiltInDreamImageKey(record.imageReference)) {
          setImageChoice({ mode: 'builtIn', id: record.imageReference });
        } else if (record.imageType === 'local') {
          setImageChoice({
            mode: 'localExisting',
            relativePath: record.imageReference,
            previewUri: resolveRelativeDreamImageUri(record.imageReference),
          });
        } else {
          setImageChoice({ mode: 'builtIn', id: 'car' });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'טעינת החלום נכשלה');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDream();
    return () => {
      cancelled = true;
    };
  }, [dreamId]);

  const contentPaddingBottom = useMemo(() => {
    if (keyboardVisible && keyboardMetrics) {
      if (Platform.OS === 'android') {
        return keyboardMetrics.height + 32;
      }
      return 24;
    }
    return Math.max(insets.bottom, 12) + 20;
  }, [insets.bottom, keyboardMetrics, keyboardVisible]);

  const validate = useCallback((): FormErrors => {
    const next: FormErrors = {};
    if (!title.trim()) {
      next.title = 'שם החלום חובה';
    }
    if (!imageChoice) {
      next.image = 'יש לבחור תמונה';
    }
    const target = parseShekelsInput(targetShekels);
    if (target === null || target <= 0) {
      next.target = 'סכום היעד חייב להיות גדול מאפס';
    }
    const planningErrors = validateDreamPlanningForm(monthlyShekels, targetDateInput);
    if (planningErrors.monthly) {
      next.monthly = planningErrors.monthly;
    }
    if (planningErrors.targetDate) {
      next.targetDate = planningErrors.targetDate;
    }
    return next;
  }, [imageChoice, monthlyShekels, targetDateInput, targetShekels, title]);

  const onPickMyImage = useCallback(async () => {
    if (pickingImage || saving) {
      return;
    }

    setPickingImage(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.image;
      delete next.general;
      return next;
    });

    try {
      const result = await pickDreamGalleryImage();
      if (result.status === 'canceled') {
        return;
      }
      if (result.status === 'error') {
        setErrors((prev) => ({ ...prev, image: result.message }));
        return;
      }
      setImageChoice({ mode: 'localNew', previewUri: result.uri });
    } finally {
      setPickingImage(false);
    }
  }, [pickingImage, saving]);

  const onSave = useCallback(async () => {
    if (savingRef.current || !dreamId || !imageChoice) {
      return;
    }

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    const original = originalRecordRef.current;
    if (!original) {
      setErrors({ general: 'לא ניתן לשמור — נתוני החלום לא נטענו' });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setErrors({});

    let pendingNewLocalPath: string | null = null;

    try {
      const db = await getDatabase();
      const targetAgorot = ilsToAgorot(parseShekelsInput(targetShekels)!);

      let imageType: 'builtIn' | 'local';
      let imageReference: string;
      let accentColor: string;

      if (imageChoice.mode === 'builtIn') {
        const imageOption = builtInDreamImageOptions.find((o) => o.id === imageChoice.id)!;
        imageType = 'builtIn';
        imageReference = imageOption.id;
        accentColor = imageOption.accent;
      } else if (imageChoice.mode === 'localExisting') {
        imageType = 'local';
        imageReference = imageChoice.relativePath;
        accentColor = original.accentColor || LOCAL_DREAM_IMAGE_ACCENT;
      } else {
        pendingNewLocalPath = await copyPickerImageToDreamStore(imageChoice.previewUri);
        imageType = 'local';
        imageReference = pendingNewLocalPath;
        accentColor = LOCAL_DREAM_IMAGE_ACCENT;
      }

      const planning = dreamPlanningFormValues(monthlyShekels, targetDateInput);

      await updateDream(db, dreamId, {
        title: title.trim(),
        description: description.trim() || null,
        targetAmountAgorot: targetAgorot,
        imageType,
        imageReference,
        accentColor,
        monthlySavingsAgorot: planning.monthlySavingsAgorot,
        targetDate: planning.targetDateYmd,
      });

      pendingNewLocalPath = null;

      const previousLocalPath =
        original.imageType === 'local' ? original.imageReference : null;
      const localPathChanged =
        previousLocalPath !== null &&
        (imageType !== 'local' || imageReference !== previousLocalPath);

      if (localPathChanged && previousLocalPath) {
        const remainingUses = await countDreamsWithLocalImageReference(db, previousLocalPath);
        if (remainingUses === 0) {
          try {
            await deleteDreamImageFile(previousLocalPath);
          } catch {
            console.warn(
              `[Wishly] לא ניתן למחוק תמונה ישנה לאחר עדכון: ${previousLocalPath}`,
            );
          }
        }
      }

      router.back();
    } catch (error) {
      if (pendingNewLocalPath) {
        try {
          await deleteDreamImageFile(pendingNewLocalPath);
        } catch {
          // Best-effort cleanup of orphaned copy after failed update.
        }
      }

      const message =
        error instanceof ValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'עדכון החלום נכשל';
      setErrors({ general: message });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    description,
    dreamId,
    imageChoice,
    monthlyShekels,
    router,
    targetDateInput,
    targetShekels,
    title,
    validate,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{loadError}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backHit}>
            <Text style={styles.backLabel}>← חזרה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const localPreviewUri =
    imageChoice?.mode === 'localExisting' || imageChoice?.mode === 'localNew'
      ? imageChoice.previewUri
      : null;
  const localSelected =
    imageChoice?.mode === 'localExisting' || imageChoice?.mode === 'localNew';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.back()}
              style={styles.backHit}>
              <Text style={styles.backLabel}>← ביטול</Text>
            </Pressable>
            {keyboardVisible ? (
              <Pressable
                accessibilityRole="button"
                onPress={Keyboard.dismiss}
                style={styles.dismissKeyboardHit}>
                <Text style={styles.dismissKeyboardLabel}>סגירת מקלדת</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.screenTitle}>עריכת חלום</Text>
          <Text style={styles.screenSubtitle}>עדכנו את פרטי החלום — היתרה והיסטוריה נשמרות</Text>

          {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.label}>שם החלום *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="למשל: טיול למשפחה"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.title && styles.inputError]}
              textAlign="right"
            />
            {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

            <Text style={styles.label}>תיאור קצר</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="משפט שמחבר אתכם לחלום (אופציונלי)"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.inputMultiline]}
              textAlign="right"
              multiline
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>בחירת תמונה *</Text>
            <View style={styles.imageGrid}>
              {builtInDreamImageOptions.map((option) => {
                const selected = imageChoice?.mode === 'builtIn' && imageChoice.id === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setImageChoice({ mode: 'builtIn', id: option.id })}
                    style={[
                      styles.imageTile,
                      selected && styles.imageTileSelected,
                      { borderColor: selected ? colors.primary : 'rgba(38, 51, 75, 0.12)' },
                    ]}>
                    <Image source={dreamImageAssets[option.id]} style={styles.imagePreview} />
                    <Text style={styles.imageLabel}>{option.label}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: localSelected }}
                disabled={pickingImage || saving}
                onPress={() => void onPickMyImage()}
                style={[
                  styles.imageTile,
                  localSelected && styles.imageTileSelected,
                  {
                    borderColor: localSelected ? colors.primary : 'rgba(38, 51, 75, 0.12)',
                  },
                ]}>
                {localPreviewUri ? (
                  <Image source={{ uri: localPreviewUri }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.myImagePlaceholder}>
                    {pickingImage ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <Text style={styles.myImagePlaceholderText}>+</Text>
                    )}
                  </View>
                )}
                <Text style={styles.imageLabel}>{LOCAL_DREAM_IMAGE_LABEL}</Text>
              </Pressable>
            </View>
            {errors.image ? <Text style={styles.fieldError}>{errors.image}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>סכום יעד (₪) *</Text>
            <TextInput
              value={targetShekels}
              onChangeText={setTargetShekels}
              onFocus={scrollTargetIntoView}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, errors.target && styles.inputError]}
              textAlign="right"
            />
            {errors.target ? <Text style={styles.fieldError}>{errors.target}</Text> : null}
          </View>

          <DreamSavingsPlanFields
            monthlyShekels={monthlyShekels}
            targetDateInput={targetDateInput}
            monthlyError={errors.monthly}
            targetDateError={errors.targetDate}
            onChangeMonthlyShekels={setMonthlyShekels}
            onChangeTargetDateInput={setTargetDateInput}
            onFocusMonthly={scrollTargetIntoView}
          />

          {!keyboardVisible ? (
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => void onSave()}
              style={({ pressed }) => [
                styles.saveButton,
                saving && styles.saveButtonDisabled,
                pressed && !saving && styles.saveButtonPressed,
              ]}>
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveLabel}>שמירת השינויים</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  dismissKeyboardHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dismissKeyboardLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  backHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backLabel: {
    ...typography.stat,
    color: colors.primary,
  },
  screenTitle: {
    ...typography.headline,
    textAlign: 'right',
    marginBottom: 6,
  },
  screenSubtitle: {
    ...typography.body,
    textAlign: 'right',
    color: colors.textMuted,
    marginBottom: 16,
  },
  errorTitle: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 16,
  },
  generalError: {
    ...typography.caption,
    color: colors.pink,
    textAlign: 'right',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 3,
  },
  label: {
    ...typography.stat,
    textAlign: 'right',
    marginBottom: 8,
  },
  input: {
    ...typography.body,
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.pink,
  },
  fieldError: {
    ...typography.caption,
    color: colors.pink,
    textAlign: 'right',
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  imageTile: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: colors.white,
    marginBottom: 4,
  },
  imageTileSelected: {
    backgroundColor: 'rgba(118, 86, 232, 0.06)',
  },
  imagePreview: {
    width: '100%',
    height: 92,
    resizeMode: 'cover',
  },
  myImagePlaceholder: {
    width: '100%',
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 247, 236, 0.9)',
  },
  myImagePlaceholderText: {
    ...typography.headline,
    color: colors.primary,
    fontSize: 28,
    lineHeight: 32,
  },
  imageLabel: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: 8,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  saveButtonDisabled: {
    opacity: 0.85,
  },
  saveLabel: {
    ...typography.button,
  },
});
