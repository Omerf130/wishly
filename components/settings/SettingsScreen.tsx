import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupValidateSection } from '@/components/settings/BackupValidateSection';
import { colors, typography } from '@/constants/theme';
import { pruneOldBackupCacheFiles } from '@/utils/wishlyBackup/backupCache';
import { createWishlyBackup } from '@/utils/wishlyBackup/createWishlyBackup';
import { isShareUserCancelled, shareWishlyBackupFile } from '@/utils/wishlyBackup/shareWishlyBackup';
import {
  devLogBackupFailure,
  type WishlyBackupFlowStage,
} from '@/utils/wishlyBackup/devBackupDiagnostic';
import { toUserFacingBackupError } from '@/utils/wishlyBackup/userFacingBackupError';

type BackupFlowPhase = 'idle' | 'creating' | 'sharing';

const NEUTRAL_AFTER_SHARE =
  'קובץ הגיבוי הוכן. ודא ששמרת אותו במקום בטוח.';

export function SettingsScreen() {
  const [phase, setPhase] = useState<BackupFlowPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const flowActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const filesInUseRef = useRef<string[]>([]);
  const flowStageRef = useRef<WishlyBackupFlowStage>('idle');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runPrune = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    try {
      await pruneOldBackupCacheFiles(filesInUseRef.current);
    } catch {
      // Best-effort; ignore.
    }
  }, []);

  const onPressCreateBackup = useCallback(async () => {
    if (flowActiveRef.current || phase !== 'idle') {
      return;
    }

    flowActiveRef.current = true;
    setErrorMessage(null);
    setStatusMessage(null);
    setPhase('creating');
    flowStageRef.current = 'creating';
    filesInUseRef.current = [];

    let createdUri: string | null = null;
    let sharedUri: string | null = null;

    try {
      const backup = await createWishlyBackup();
      if (!mountedRef.current) {
        return;
      }

      createdUri = backup.fileUri;
      filesInUseRef.current = [createdUri];

      setPhase('sharing');
      flowStageRef.current = 'sharing';
      const shareResult = await shareWishlyBackupFile({
        fileUri: backup.fileUri,
        createdAt: backup.createdAt,
        byteSize: backup.byteSize,
      });

      if (!mountedRef.current) {
        return;
      }

      sharedUri = shareResult.sharedUri;
      filesInUseRef.current = [createdUri, sharedUri].filter(
        (uri, index, arr) => arr.indexOf(uri) === index,
      );

      const emptyData = backup.dreamCount === 0 && backup.transactionCount === 0;
      setStatusMessage(
        emptyData
          ? `אין עדיין חלומות או פעולות במסד. ${NEUTRAL_AFTER_SHARE}`
          : NEUTRAL_AFTER_SHARE,
      );
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      devLogBackupFailure({ flowStage: flowStageRef.current }, error);

      if (isShareUserCancelled(error)) {
        setErrorMessage('שיתוף הגיבוי בוטל.');
      } else {
        setErrorMessage(toUserFacingBackupError(error));
      }

      if (createdUri) {
        filesInUseRef.current = sharedUri
          ? [createdUri, sharedUri]
          : [createdUri];
      }
    } finally {
      flowActiveRef.current = false;
      if (mountedRef.current) {
        setPhase('idle');
      }
      flowStageRef.current = 'idle';
      await runPrune();
    }
  }, [phase, runPrune]);

  const busy = phase !== 'idle';
  const progressLabel =
    phase === 'creating'
      ? 'מכינים את הגיבוי שלך...'
      : phase === 'sharing'
        ? 'פותחים חלונית שיתוף...'
        : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            הגדרות
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>גיבוי הנתונים שלי</Text>
          <Text style={styles.sectionDescription}>
            שמור עותק של החלומות, החסכונות והתמונות שלך כדי שתוכל לשחזר אותם בעתיד.
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

          {statusMessage ? (
            <Text style={styles.statusText} accessibilityLiveRegion="polite">
              {statusMessage}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => {
              void onPressCreateBackup();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              busy && styles.primaryButtonDisabled,
              pressed && !busy && styles.primaryButtonPressed,
            ]}>
            <Text style={styles.primaryButtonLabel}>יצירת גיבוי</Text>
          </Pressable>

          <Text style={styles.privacyNote}>
            קובץ הגיבוי מכיל מידע אישי ותמונות ואינו מוצפן. מומלץ לשמור אותו במקום פרטי ובטוח.
          </Text>
        </View>

        <BackupValidateSection />
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
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    ...typography.screenTitle,
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 36,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 22,
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
  statusText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 14,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonDisabled: {
    opacity: 0.85,
  },
  primaryButtonLabel: {
    ...typography.button,
  },
  privacyNote: {
    ...typography.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
    color: colors.textMuted,
    marginTop: 14,
    lineHeight: 20,
  },
});
