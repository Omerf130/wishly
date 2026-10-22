import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { colors, typography } from '@/constants/theme';
import { getDatabase } from '@/database/client';
import {
  addDeposit,
  addWithdrawal,
  getDreamById,
  getSavedAmountForDream,
} from '@/database';
import { InsufficientBalanceError, ValidationError } from '@/database/errors';
import { agorotToIls, ilsToAgorot } from '@/database/money';
import { formatIlsExact } from '@/utils/formatCurrency';
import { parseShekelsInput } from '@/utils/parseShekelsInput';

type SavingsMode = 'deposit' | 'withdrawal';

type KeyboardMetrics = {
  height: number;
};

export default function DreamSavingsActionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: dreamId } = useLocalSearchParams<{ id: string }>();

  const savingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dreamTitle, setDreamTitle] = useState('');
  const [savedAgorot, setSavedAgorot] = useState(0);

  const [mode, setMode] = useState<SavingsMode>('deposit');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardMetrics, setKeyboardMetrics] = useState<KeyboardMetrics | null>(null);

  const keyboardVisible = keyboardMetrics !== null;
  const savedIls = agorotToIls(savedAgorot);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardMetrics({ height: event.endCoordinates.height });
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardMetrics(null);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
        const balance = await getSavedAmountForDream(db, dreamId);
        if (!cancelled) {
          setDreamTitle(record.title);
          setSavedAgorot(balance);
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

    void load();
    return () => {
      cancelled = true;
    };
  }, [dreamId]);

  const parsedAmount = useMemo(() => parseShekelsInput(amountText), [amountText]);

  const previewSavedIls = useMemo(() => {
    if (parsedAmount === null || parsedAmount <= 0) {
      return savedIls;
    }
    const deltaAgorot = ilsToAgorot(parsedAmount);
    if (mode === 'deposit') {
      return agorotToIls(savedAgorot + deltaAgorot);
    }
    return agorotToIls(Math.max(0, savedAgorot - deltaAgorot));
  }, [mode, parsedAmount, savedAgorot, savedIls]);

  const contentPaddingBottom = useMemo(() => {
    if (keyboardVisible && keyboardMetrics) {
      if (Platform.OS === 'android') {
        return keyboardMetrics.height + 32;
      }
      return 24;
    }
    return Math.max(insets.bottom, 12) + 20;
  }, [insets.bottom, keyboardMetrics, keyboardVisible]);

  const validateForm = useCallback((): string | null => {
    if (parsedAmount === null) {
      return 'סכום לא תקין';
    }
    if (parsedAmount <= 0) {
      return 'הסכום חייב להיות גדול מאפס';
    }
    const amountAgorot = ilsToAgorot(parsedAmount);
    if (mode === 'withdrawal' && amountAgorot > savedAgorot) {
      return 'לא ניתן למשוך יותר מהיתרה הקיימת';
    }
    return null;
  }, [mode, parsedAmount, savedAgorot]);

  const onSubmit = useCallback(async () => {
    if (savingRef.current || !dreamId) {
      return;
    }

    const validationMessage = validateForm();
    if (validationMessage) {
      setFieldError(validationMessage);
      return;
    }

    const amountAgorot = ilsToAgorot(parsedAmount!);
    const trimmedNote = note.trim() || null;

    savingRef.current = true;
    setSubmitting(true);
    setFieldError(null);

    try {
      const db = await getDatabase();
      const input = {
        dreamId,
        amountAgorot,
        note: trimmedNote,
      };

      if (mode === 'deposit') {
        await addDeposit(db, input);
      } else {
        await addWithdrawal(db, input);
      }

      const successTitle = mode === 'deposit' ? 'החיסכון נוסף' : 'המשיכה בוצעה';
      const successBody =
        mode === 'deposit'
          ? 'היתרה והיסטוריית החיסכון עודכנו.'
          : 'היתרה והיסטוריית החיסכון עודכנו.';

      Alert.alert(successTitle, successBody, [
        {
          text: 'הבנתי',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ValidationError || error instanceof InsufficientBalanceError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'שמירת הפעולה נכשלה';
      setFieldError(message);
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  }, [dreamId, mode, note, parsedAmount, router, validateForm]);

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
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnLabel}>חזרה</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: contentPaddingBottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backHit}>
              <Text style={styles.backLabel}>← ביטול</Text>
            </Pressable>
            {keyboardVisible ? (
              <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.dismissHit}>
                <Text style={styles.dismissLabel}>סגירת מקלדת</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.screenTitle}>פעולת חיסכון</Text>
          <Text style={styles.screenSubtitle} numberOfLines={2}>
            {dreamTitle}
          </Text>

          <View style={styles.modeRow}>
            <ModeChip
              label="הוספת חיסכון"
              selected={mode === 'deposit'}
              onPress={() => {
                setMode('deposit');
                setFieldError(null);
              }}
            />
            <ModeChip
              label="משיכת כסף"
              selected={mode === 'withdrawal'}
              onPress={() => {
                setMode('withdrawal');
                setFieldError(null);
              }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>יתרה נוכחית</Text>
            <Text style={styles.balanceValue}>{formatIlsExact(savedIls)}</Text>

            <Text style={styles.label}>סכום (₪) *</Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.input, fieldError && styles.inputError]}
              textAlign="right"
              accessibilityLabel="סכום בשקלים"
            />

            <Text style={styles.label}>הערה (אופציונלי)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="למשל: חיסכון מהמשכורת"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.noteInput]}
              textAlign="right"
              multiline
            />

            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>יתרה לאחר הפעולה</Text>
              <Text style={styles.previewValue}>{formatIlsExact(previewSavedIls)}</Text>
            </View>

            {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={() => void onSubmit()}
            style={({ pressed }) => [
              styles.primaryBtn,
              submitting && styles.primaryBtnDisabled,
              pressed && !submitting && styles.primaryBtnPressed,
            ]}>
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryBtnLabel}>
                {mode === 'deposit' ? 'אישור הוספת חיסכון' : 'אישור משיכה'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ModeChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.modeChip, selected && styles.modeChipSelected]}>
      <Text style={[styles.modeChipLabel, selected && styles.modeChipLabelSelected]}>{label}</Text>
    </Pressable>
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
    marginTop: 4,
    marginBottom: 8,
  },
  backHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backLabel: {
    ...typography.stat,
    color: colors.primary,
  },
  dismissHit: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dismissLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
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
  modeRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },
  modeChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(118, 86, 232, 0.2)',
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  modeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
  },
  modeChipLabel: {
    ...typography.stat,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modeChipLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
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
  balanceValue: {
    ...typography.headline,
    textAlign: 'right',
    color: colors.primary,
    marginBottom: 16,
  },
  input: {
    ...typography.body,
    backgroundColor: 'rgba(255, 247, 236, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    color: colors.text,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.pink,
  },
  previewBox: {
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 247, 236, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(118, 86, 232, 0.12)',
  },
  previewLabel: {
    ...typography.caption,
    textAlign: 'right',
    marginBottom: 4,
  },
  previewValue: {
    ...typography.stat,
    fontSize: 20,
    textAlign: 'right',
    color: colors.text,
  },
  fieldError: {
    ...typography.caption,
    color: colors.pink,
    textAlign: 'right',
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryBtnDisabled: {
    opacity: 0.85,
  },
  primaryBtnLabel: {
    ...typography.button,
  },
  errorTitle: {
    ...typography.headline,
    textAlign: 'center',
    marginBottom: 16,
  },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  secondaryBtnLabel: {
    ...typography.stat,
    color: colors.primary,
  },
});
