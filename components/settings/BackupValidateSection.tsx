import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import {
  devLogBackupImportFailure,
  type BackupImportUiFlowStage,
} from '@/utils/wishlyBackup/devBackupImportDiagnostic';
import { devGetImportValidationStage } from '@/utils/wishlyBackup/devImportValidationStage';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { pickAndValidateWishlyBackupFile } from '@/utils/wishlyBackup/pickBackupForValidation';
import type { BackupValidationSuccess } from '@/utils/wishlyBackup/validateBackupArchive';

type ValidatePhase = 'idle' | 'picking' | 'validating';

function formatBackupCreatedAt(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }
  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BackupValidateSection() {
  const [phase, setPhase] = useState<ValidatePhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<BackupValidationSuccess | null>(null);

  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const uiFlowStageRef = useRef<BackupImportUiFlowStage>('idle');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onPressValidate = useCallback(async () => {
    if (busyRef.current || phase !== 'idle') {
      return;
    }

    busyRef.current = true;
    setErrorMessage(null);
    setSuccessSummary(null);
    setPhase('picking');
    uiFlowStageRef.current = 'picking';

    try {
      setPhase('validating');
      uiFlowStageRef.current = 'validating';
      const result = await pickAndValidateWishlyBackupFile();

      if (!mountedRef.current) {
        return;
      }

      if (result.ok) {
        setSuccessSummary(result);
        return;
      }

      if ('cancelled' in result && result.cancelled) {
        setErrorMessage('בחירת הקובץ בוטלה');
        return;
      }

      setErrorMessage(result.userMessage);
    } catch (error) {
      devLogBackupImportFailure(
        {
          flowStage: uiFlowStageRef.current,
          validationStage: devGetImportValidationStage(),
        },
        error,
      );
      if (mountedRef.current) {
        setErrorMessage(
          error instanceof BackupImportError
            ? error.userMessage
            : 'בדיקת קובץ הגיבוי נכשלה',
        );
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setPhase('idle');
      }
      uiFlowStageRef.current = 'idle';
    }
  }, [phase]);

  const busy = phase !== 'idle';
  const progressLabel =
    phase === 'picking'
      ? 'בוחרים קובץ…'
      : phase === 'validating'
        ? 'בודקים את קובץ הגיבוי…'
        : null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>בדיקת קובץ גיבוי</Text>
      <Text style={styles.sectionDescription}>
        בחר קובץ גיבוי של Wishly כדי לבדוק שהוא תקין לפני שחזור.
      </Text>

      {progressLabel ? (
        <View style={styles.progressRow} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.progressText}>{progressLabel}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <Text style={styles.errorText} accessibilityRole="alert">
          {errorMessage}
        </Text>
      ) : null}

      {successSummary ? (
        <View style={styles.successBox} accessibilityLiveRegion="polite">
          <Text style={styles.successTitle}>קובץ הגיבוי תקין</Text>
          <Text style={styles.successLine}>
            תאריך יצירה: {formatBackupCreatedAt(successSummary.createdAt)}
          </Text>
          <Text style={styles.successLine}>חלומות: {successSummary.dreamCount}</Text>
          <Text style={styles.successLine}>פעולות: {successSummary.transactionCount}</Text>
          <Text style={styles.successLine}>תמונות אישיות: {successSummary.imageCount}</Text>
          <Text style={styles.successLine}>גרסת גיבוי: {successSummary.backupVersion}</Text>
          <Text style={styles.neutralNote}>
            הקובץ נבדק בלבד. הנתונים הקיימים באפליקציה לא שונו.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={() => {
          void onPressValidate();
        }}
        style={({ pressed }) => [
          styles.secondaryButton,
          busy && styles.secondaryButtonDisabled,
          pressed && !busy && styles.secondaryButtonPressed,
        ]}>
        <Text style={styles.secondaryButtonLabel}>בחירת קובץ גיבוי</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
    marginTop: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    ...typography.headline,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionDescription: {
    ...typography.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 24,
  },
  progressRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorText: {
    ...typography.body,
    color: colors.pink,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 14,
  },
  successBox: {
    marginTop: 14,
    paddingTop: 4,
  },
  successTitle: {
    ...typography.headline,
    color: colors.mint,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  successLine: {
    ...typography.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: colors.text,
    marginTop: 4,
  },
  neutralNote: {
    ...typography.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: colors.textMuted,
    marginTop: 12,
    lineHeight: 20,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryButtonPressed: {
    backgroundColor: 'rgba(118, 86, 232, 0.08)',
  },
  secondaryButtonDisabled: {
    opacity: 0.85,
  },
  secondaryButtonLabel: {
    ...typography.button,
    color: colors.primary,
  },
});
