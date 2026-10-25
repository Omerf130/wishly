import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Image,
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

import { builtInDreamImageOptions } from '@/constants/builtInDreamImages';
import { dreamImageAssets } from '@/constants/dreamImages';
import type { DreamImageAssetKey } from '@/constants/dreamImages';
import {
  LOCAL_DREAM_IMAGE_ACCENT,
  LOCAL_DREAM_IMAGE_LABEL,
} from '@/constants/localDreamImage';
import { colors, typography } from '@/constants/theme';
import { getDatabase } from '@/database/client';
import { createDream } from '@/database';
import { ValidationError } from '@/database/errors';
import { ilsToAgorot } from '@/database/money';
import {
  copyPickerImageToDreamStore,
  deleteDreamImageFile,
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
  initial?: string;
  monthly?: string;
  targetDate?: string;
  general?: string;
};

type KeyboardMetrics = {
  height: number;
  screenY: number;
};

type AmountField = 'target' | 'initial';

type ImageChoice =
  | { mode: 'builtIn'; id: DreamImageAssetKey }
  | { mode: 'local'; previewUri: string };

export default function CreateDreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const savingRef = useRef(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const focusedAmountFieldRef = useRef<AmountField | null>(null);

  const titleInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const descriptionInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const targetInputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const initialInputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageChoice, setImageChoice] = useState<ImageChoice | null>(null);
  const [pickingImage, setPickingImage] = useState(false);
  const [targetShekels, setTargetShekels] = useState('');
  const [initialShekels, setInitialShekels] = useState('');
  const [monthlyShekels, setMonthlyShekels] = useState('');
  const [targetDateInput, setTargetDateInput] = useState('');
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

  const scrollAmountFieldsIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
    });
  }, []);

  useEffect(() => {
    if (!keyboardMetrics || !focusedAmountFieldRef.current) {
      return;
    }
    scrollAmountFieldsIntoView();
  }, [keyboardMetrics, scrollAmountFieldsIntoView]);

  const onAmountFieldFocus = useCallback(
    (field: AmountField) => {
      focusedAmountFieldRef.current = field;
      if (keyboardMetrics) {
        scrollAmountFieldsIntoView();
      }
    },
    [keyboardMetrics, scrollAmountFieldsIntoView],
  );

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
    const initialRaw = initialShekels.trim();
    let initial = 0;
    if (initialRaw) {
      const parsed = parseShekelsInput(initialRaw);
      if (parsed === null || parsed < 0) {
        next.initial = 'סכום התחלתי לא תקין';
      } else {
        initial = parsed;
      }
    }
    if (!next.target && !next.initial && target !== null && initial > target) {
      next.initial = 'סכום התחלתי לא יכול לעלות על סכום היעד';
    }
    const planningErrors = validateDreamPlanningForm(monthlyShekels, targetDateInput);
    if (planningErrors.monthly) {
      next.monthly = planningErrors.monthly;
    }
    if (planningErrors.targetDate) {
      next.targetDate = planningErrors.targetDate;
    }
    return next;
  }, [imageChoice, initialShekels, monthlyShekels, targetDateInput, targetShekels, title]);

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
      setImageChoice({ mode: 'local', previewUri: result.uri });
    } finally {
      setPickingImage(false);
    }
  }, [pickingImage, saving]);

  const onSave = useCallback(async () => {
    if (savingRef.current) {
      return;
    }

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    const target = parseShekelsInput(targetShekels)!;
    const initial = parseShekelsInput(initialShekels.trim() || '0') ?? 0;
    const choice = imageChoice!;

    savingRef.current = true;
    setSaving(true);
    setErrors({});

    let persistedImagePath: string | null = null;

    try {
      const db = await getDatabase();
      const targetAgorot = ilsToAgorot(target);
      const initialAgorot = initial > 0 ? ilsToAgorot(initial) : 0;

      let imageType: 'builtIn' | 'local' = 'builtIn';
      let imageReference: string;
      let accentColor: string;

      if (choice.mode === 'local') {
        persistedImagePath = await copyPickerImageToDreamStore(choice.previewUri);
        imageType = 'local';
        imageReference = persistedImagePath;
        accentColor = LOCAL_DREAM_IMAGE_ACCENT;
      } else {
        const imageOption = builtInDreamImageOptions.find((o) => o.id === choice.id)!;
        imageReference = imageOption.id;
        accentColor = imageOption.accent;
      }

      const planning = dreamPlanningFormValues(monthlyShekels, targetDateInput);

      const created = await createDream(db, {
        title: title.trim(),
        description: description.trim() || null,
        targetAmountAgorot: targetAgorot,
        imageType,
        imageReference,
        accentColor,
        monthlySavingsAgorot: planning.monthlySavingsAgorot,
        targetDate: planning.targetDateYmd,
        initialSavedAmountAgorot: initialAgorot > 0 ? initialAgorot : undefined,
      });

      router.replace(`/dream/${created.id}` as Href);
    } catch (error) {
      if (persistedImagePath) {
        try {
          await deleteDreamImageFile(persistedImagePath);
        } catch {
          // Best-effort cleanup of orphaned copy after failed save.
        }
      }

      const message =
        error instanceof ValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : choice.mode === 'local'
              ? 'שמירת החלום עם התמונה האישית נכשלה'
              : 'שמירת החלום נכשלה';
      setErrors({ general: message });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [
    description,
    imageChoice,
    monthlyShekels,
    router,
    targetDateInput,
    targetShekels,
    title,
    initialShekels,
    validate,
  ]);

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
              <Text style={styles.backLabel}>← חזרה</Text>
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

          <Text style={styles.screenTitle}>יצירת חלום חדש</Text>
          <Text style={styles.screenSubtitle}>מה החלום הבא שתרצו להגשים?</Text>

          {__DEV__ ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/dev/keyboard-test' as Href)}
              style={styles.devKeyboardTestLink}>
              <Text style={styles.devKeyboardTestLinkText}>בדיקת מקלדת (DEV)</Text>
            </Pressable>
          ) : null}

          {errors.general ? <Text style={styles.generalError}>{errors.general}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.label}>שם החלום *</Text>
            <TextInput
              ref={titleInputRef}
              value={title}
              onChangeText={setTitle}
              placeholder="למשל: טיול למשפחה"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, errors.title && styles.inputError]}
              textAlign="right"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
            />
            {errors.title ? <Text style={styles.fieldError}>{errors.title}</Text> : null}

            <Text style={styles.label}>תיאור קצר</Text>
            <TextInput
              ref={descriptionInputRef}
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
                const selected =
                  imageChoice?.mode === 'builtIn' && imageChoice.id === option.id;
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
              {(() => {
                const localSelected = imageChoice?.mode === 'local';
                const localPreviewUri =
                  imageChoice?.mode === 'local' ? imageChoice.previewUri : null;
                return (
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
                );
              })()}
            </View>
            {errors.image ? <Text style={styles.fieldError}>{errors.image}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>סכום יעד (₪) *</Text>
            <TextInput
              ref={targetInputRef}
              value={targetShekels}
              onChangeText={setTargetShekels}
              onFocus={() => onAmountFieldFocus('target')}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, errors.target && styles.inputError]}
              textAlign="right"
            />
            {errors.target ? <Text style={styles.fieldError}>{errors.target}</Text> : null}

            <Text style={styles.label}>כבר נחסך (₪)</Text>
            <TextInput
              ref={initialInputRef}
              value={initialShekels}
              onChangeText={setInitialShekels}
              onFocus={() => onAmountFieldFocus('initial')}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, errors.initial && styles.inputError]}
              textAlign="right"
            />
            {errors.initial ? <Text style={styles.fieldError}>{errors.initial}</Text> : null}
            <Text style={styles.hint}>ברירת מחדל: 0 ₪ — יישמר כפעולת חיסכון ראשונה אם גדול מאפס</Text>
          </View>

          <DreamSavingsPlanFields
            monthlyShekels={monthlyShekels}
            targetDateInput={targetDateInput}
            monthlyError={errors.monthly}
            targetDateError={errors.targetDate}
            onChangeMonthlyShekels={setMonthlyShekels}
            onChangeTargetDateInput={setTargetDateInput}
            onFocusMonthly={() => {
              focusedAmountFieldRef.current = 'target';
              scrollAmountFieldsIntoView();
            }}
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
                <Text style={styles.saveLabel}>שמירת החלום</Text>
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
  devKeyboardTestLink: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  devKeyboardTestLinkText: {
    ...typography.caption,
    color: colors.mint,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  hint: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.textMuted,
    marginTop: 4,
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
