import { type Href, Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDatabase } from '@/database/client';
import {
  buildOrphanTransactionsReport,
  deleteProvablyDevOrphanTransactions,
  formatOrphanTransactionsReport,
  type OrphanTransactionsReport,
} from '@/database/orphans';
import {
  formatCascadeDeleteDiagnosticReport,
  runWishlyDatabaseSelfTest,
  summarizeSelfTestResults,
  type CascadeDeleteDiagnostic,
  type SelfTestResult,
} from '@/database/selfTest';
import { colors, typography } from '@/constants/theme';

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.diagRow}>
      <Text style={styles.diagValue} selectable>
        {value}
      </Text>
      <Text style={styles.diagLabel}>{label}</Text>
    </View>
  );
}

function CascadeDeleteDiagnosticSection({ diag }: { diag: CascadeDeleteDiagnostic }) {
  const reportText = useMemo(() => formatCascadeDeleteDiagnosticReport(diag), [diag]);

  const onShareReport = useCallback(async () => {
    try {
      await Share.share({ message: reportText, title: 'Wishly cascade diagnostic' });
    } catch {
      // User dismissed share sheet — no action needed.
    }
  }, [reportText]);

  const fkCheckSummary =
    diag.foreignKeyCheckAfterDelete.length === 0
      ? 'אין הפרות (ריק)'
      : `${diag.foreignKeyCheckAfterDelete.length} הפרות — ראה דוח מלא`;

  const repositorySummary = diag.repositoryNotFoundAfterDeleteExpected
    ? 'NotFoundError (צפוי — החלום נמחק)'
    : diag.repositorySqlMismatchAfterDelete
      ? `אי-התאמה: SQL=${diag.sqlTxCountAfterDelete}, repo=${diag.repositoryTxCountAfterDelete}`
      : `תואם SQL (${diag.repositoryTxCountAfterDelete})`;

  const errorParts = [
    diag.deleteDreamError,
    !diag.cascadeTestPassed ? diag.cascadeAssertionError : null,
    diag.repositoryQueryErrorAfterDelete && !diag.repositoryNotFoundAfterDeleteExpected
      ? diag.repositoryQueryErrorAfterDelete
      : null,
  ].filter(Boolean);

  return (
    <View style={styles.diagSection}>
      <Text style={styles.diagTitle}>פרטי אבחון מחיקת חלום</Text>
      <Text style={styles.diagHint}>
        dreamId: {diag.dreamId} · {diag.databaseName}
        {diag.databasePath ? ` · ${diag.databasePath}` : ''}
      </Text>

      <DiagnosticRow
        label="foreign_keys (לפני מחיקה)"
        value={String(diag.foreignKeysPragmaBeforeDelete ?? 'null')}
      />
      <DiagnosticRow
        label="foreign_keys (אחרי מחיקה)"
        value={String(diag.foreignKeysPragmaAfterDelete ?? 'null')}
      />
      <DiagnosticRow
        label="ON DELETE"
        value={diag.onDeleteAction ?? '(לא נמצא ב-FK list)'}
      />
      <DiagnosticRow
        label="פעולות לפני מחיקה (SQL / repo)"
        value={`${diag.sqlTxCountBeforeDelete} / ${diag.repositoryTxCountBeforeDelete}${
          diag.repositorySqlMismatchBeforeDelete ? ' — אי-התאמה!' : ''
        }`}
      />
      <DiagnosticRow
        label="חלומות עם מזהה זה אחרי מחיקה (SQL)"
        value={String(diag.sqlDreamCountAfterDelete)}
      />
      <DiagnosticRow
        label="פעולות אחרי מחיקה (SQL)"
        value={String(diag.sqlTxCountAfterDelete)}
      />
      <DiagnosticRow label="תוצאת Repository" value={repositorySummary} />
      <DiagnosticRow label="foreign_key_check" value={fkCheckSummary} />
      <DiagnosticRow
        label="CASCADE — חלום הבדיקה הנוכחי"
        value={diag.cascadeTestPassed ? 'עבר' : 'נכשל'}
      />
      <DiagnosticRow
        label="שלמות מסד (גלובלי)"
        value={diag.databaseIntegrityNote ?? '—'}
      />
      <DiagnosticRow
        label="יתומים במסד (פעולות בלי חלום)"
        value={String(diag.totalOrphanTransactionsInDb)}
      />

      {errorParts.length > 0 ? (
        <Text style={styles.diagError} selectable>
          שגיאה: {errorParts.join(' · ')}
        </Text>
      ) : null}

      {diag.cleanupFailures.length > 0 ? (
        <Text style={styles.diagError} selectable>
          ניקוי: {diag.cleanupFailures.join('; ')}
        </Text>
      ) : null}

      <Text style={styles.diagSubheading}>הגדרת Foreign Key (sqlite_master)</Text>
      <Text style={styles.diagMono} selectable>
        {diag.savingsTransactionsTableSql ?? '(null)'}
      </Text>

      <Text style={styles.diagSubheading}>foreign_key_list (JSON)</Text>
      <Text style={styles.diagMono} selectable>
        {JSON.stringify(diag.foreignKeyList, null, 2)}
      </Text>

      <Text style={styles.diagSubheading}>foreign_key_check (JSON)</Text>
      <Text style={styles.diagMono} selectable>
        {JSON.stringify(diag.foreignKeyCheckAfterDelete, null, 2)}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onShareReport}
        style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}>
        <Text style={styles.copyButtonLabel}>שתף / העתק דוח אבחון</Text>
      </Pressable>
      <Text style={styles.diagFootnote}>
        ניתן גם ללחוץ לחיצה ארוכה על הטקסט למעלה ולהעתיק ידנית. הדוח המלא מופיע למטה.
      </Text>
      <Text style={styles.diagMono} selectable>
        {reportText}
      </Text>
    </View>
  );
}

function OrphanTransactionsSection({
  report,
  onRefresh,
  refreshing,
}: {
  report: OrphanTransactionsReport | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const reportText = useMemo(
    () => (report ? formatOrphanTransactionsReport(report) : ''),
    [report],
  );

  const onShareOrphans = useCallback(async () => {
    if (!reportText) {
      return;
    }
    try {
      await Share.share({ message: reportText, title: 'Wishly orphan transactions' });
    } catch {
      // dismissed
    }
  }, [reportText]);

  const onCleanupProvable = useCallback(() => {
    if (!report || report.provablyDevSelfTestCount === 0) {
      return;
    }

    Alert.alert(
      'ניקוי יתומים מסומנים',
      `יימחקו ${report.provablyDevSelfTestCount} פעולות יתומות שבהן ההערה מכילה [DEV-SELFTEST].\n` +
        `${report.unclassifiedCount} רשומות לא מסומנות לא יימחקו.\n\n` +
        'האם להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק מסומנות בלבד',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const db = await getDatabase();
                const result = await deleteProvablyDevOrphanTransactions(db);
                Alert.alert(
                  'ניקוי הושלם',
                  `נמחקו ${result.deletedCount} פעולות.`,
                );
                onRefresh();
              } catch (error) {
                Alert.alert(
                  'ניקוי נכשל',
                  error instanceof Error ? error.message : String(error),
                );
              }
            })();
          },
        },
      ],
    );
  }, [onRefresh, report]);

  if (!report) {
    return null;
  }

  return (
    <View style={styles.diagSection}>
      <Text style={styles.diagTitle}>פעולות יתומות (לפני מחיקת CASCADE)</Text>
      <DiagnosticRow label="סה״כ יתומות" value={String(report.totalCount)} />
      <DiagnosticRow
        label="מסומנות [DEV-SELFTEST] בהערה"
        value={String(report.provablyDevSelfTestCount)}
      />
      <DiagnosticRow label="דורשות סקירה ידנית" value={String(report.unclassifiedCount)} />
      <DiagnosticRow
        label="סכום הפקדות (אגורות)"
        value={String(report.totalAmountAgorotDeposits)}
      />
      <DiagnosticRow
        label="סכום משיכות (אגורות)"
        value={String(report.totalAmountAgorotWithdrawals)}
      />

      {report.unclassifiedCount > 0 ? (
        <Text style={styles.diagFootnote}>
          {report.unclassifiedCount} יתומות לא ניתן להוכיח שמדובר בבדיקות פיתוח (למשל «יתרת
          פתיחה» בלי סימון DEV). לא יימחקו אוטומטית — סקור את הרשימה למטה.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={refreshing}
        onPress={onRefresh}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.copyButtonPressed]}>
        {refreshing ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.secondaryButtonLabel}>רענן דוח יתומות</Text>
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={report.provablyDevSelfTestCount === 0}
        onPress={onCleanupProvable}
        style={({ pressed }) => [
          styles.cleanupButton,
          report.provablyDevSelfTestCount === 0 && styles.cleanupButtonDisabled,
          pressed && report.provablyDevSelfTestCount > 0 && styles.copyButtonPressed,
        ]}>
        <Text style={styles.cleanupButtonLabel}>
          {report.provablyDevSelfTestCount === 0
            ? 'אין יתומות מסומנות לניקוי בטוח'
            : `נקה ${report.provablyDevSelfTestCount} יתומות מסומנות [DEV-SELFTEST]`}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onShareOrphans}
        style={({ pressed }) => [styles.copyButton, pressed && styles.copyButtonPressed]}>
        <Text style={styles.copyButtonLabel}>שתף / העתק דוח יתומות</Text>
      </Pressable>

      <Text style={styles.diagMono} selectable>
        {reportText}
      </Text>
    </View>
  );
}

export default function DevSqliteTestScreen() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [orphanRefreshing, setOrphanRefreshing] = useState(false);
  const [results, setResults] = useState<SelfTestResult[] | null>(null);
  const [cascadeDiagnostic, setCascadeDiagnostic] = useState<CascadeDeleteDiagnostic | null>(
    null,
  );
  const [orphanReport, setOrphanReport] = useState<OrphanTransactionsReport | null>(null);

  const refreshOrphanReport = useCallback(async () => {
    setOrphanRefreshing(true);
    try {
      const db = await getDatabase();
      setOrphanReport(await buildOrphanTransactionsReport(db));
    } catch (error) {
      Alert.alert(
        'שגיאה',
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setOrphanRefreshing(false);
    }
  }, []);

  const onRun = useCallback(async () => {
    setRunning(true);
    setResults(null);
    setCascadeDiagnostic(null);
    try {
      const output = await runWishlyDatabaseSelfTest();
      setResults(output.results);
      setCascadeDiagnostic(output.cascadeDeleteDiagnostic);
      setOrphanReport(output.orphanReportBeforeCascade);
    } catch (error) {
      setResults([
        {
          name: 'fatal error',
          passed: false,
          detail: error instanceof Error ? error.message : String(error),
        },
      ]);
    } finally {
      setRunning(false);
    }
  }, []);

  if (!__DEV__) {
    return <Redirect href={'/' as Href} />;
  }

  const summary = results ? summarizeSelfTestResults(results) : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.banner}>כלי פיתוח בלבד — לא מוצג ב-Production</Text>
        <Text style={styles.title}>בדיקת SQLite (wishly.db)</Text>
        <Text style={styles.body}>
          הבדיקה יוצרת חלום מסומן [DEV-SELFTEST], מריצה פעולות, ומוחקת רק אותו. נתונים
          קיימים של משתמש לא נמחקים. CASCADE נמדד לפי SQL לחלום הבדיקה; יתומות היסטוריות
          מדווחות בנפרד.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={running}
          onPress={onRun}
          style={({ pressed }) => [
            styles.runButton,
            running && styles.runButtonDisabled,
            pressed && !running && styles.runButtonPressed,
          ]}>
          {running ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.runLabel}>הרץ בדיקת SQLite</Text>
          )}
        </Pressable>

        {summary ? (
          <View
            style={[
              styles.summary,
              summary.allPassed ? styles.summaryOk : styles.summaryFail,
            ]}>
            <Text style={styles.summaryTitle}>
              {summary.allPassed ? 'הצלחה — כל הבדיקות עברו' : 'נכשל — יש בדיקות שלא עברו'}
            </Text>
            <Text style={styles.summaryMeta}>
              {summary.passedCount} עברו · {summary.failedCount} נכשלו
            </Text>
          </View>
        ) : null}

        {orphanReport ? (
          <OrphanTransactionsSection
            onRefresh={refreshOrphanReport}
            refreshing={orphanRefreshing}
            report={orphanReport}
          />
        ) : null}

        {cascadeDiagnostic ? (
          <CascadeDeleteDiagnosticSection diag={cascadeDiagnostic} />
        ) : results ? (
          <Text style={styles.diagMissing}>
            לא נאספו נתוני אבחון למחיקה (הבדיקה לא הגיעה לשלב cascade או נכשלה לפניו).
          </Text>
        ) : null}

        {results?.map((item) => (
          <View
            key={item.name}
            style={[styles.row, item.passed ? styles.rowOk : styles.rowFail]}>
            <Text style={styles.rowTitle}>
              {item.passed ? '✓' : '✗'} {item.name}
            </Text>
            {item.detail ? (
              <Text style={styles.rowDetail} selectable>
                {item.detail}
              </Text>
            ) : null}
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.back}>
          <Text style={styles.backText}>חזרה</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  banner: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.peach,
    marginBottom: 12,
    fontWeight: '700',
  },
  title: {
    ...typography.headline,
    textAlign: 'right',
    marginBottom: 8,
  },
  body: {
    ...typography.body,
    textAlign: 'right',
    marginBottom: 20,
  },
  runButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  runButtonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  runButtonDisabled: {
    opacity: 0.85,
  },
  runLabel: {
    ...typography.button,
  },
  summary: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  summaryOk: {
    backgroundColor: 'rgba(80, 200, 179, 0.2)',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  summaryFail: {
    backgroundColor: 'rgba(237, 134, 165, 0.18)',
    borderWidth: 1,
    borderColor: colors.pink,
  },
  summaryTitle: {
    ...typography.stat,
    textAlign: 'right',
  },
  summaryMeta: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
  },
  diagSection: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  diagTitle: {
    ...typography.stat,
    textAlign: 'right',
    marginBottom: 8,
  },
  diagHint: {
    ...typography.caption,
    textAlign: 'right',
    marginBottom: 12,
    color: colors.textMuted,
  },
  diagRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  diagLabel: {
    ...typography.caption,
    flexShrink: 0,
    maxWidth: '45%',
    textAlign: 'right',
  },
  diagValue: {
    ...typography.caption,
    flex: 1,
    textAlign: 'left',
    fontWeight: '600',
  },
  diagError: {
    ...typography.caption,
    textAlign: 'right',
    color: colors.pink,
    marginTop: 8,
    marginBottom: 4,
  },
  diagSubheading: {
    ...typography.caption,
    textAlign: 'right',
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  diagMono: {
    ...typography.caption,
    textAlign: 'left',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  diagFootnote: {
    ...typography.caption,
    textAlign: 'right',
    marginBottom: 8,
    color: colors.textMuted,
  },
  diagMissing: {
    ...typography.caption,
    textAlign: 'right',
    marginBottom: 16,
    color: colors.peach,
  },
  copyButton: {
    backgroundColor: colors.mint,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.mint,
  },
  secondaryButtonLabel: {
    ...typography.button,
    color: colors.text,
  },
  cleanupButton: {
    backgroundColor: colors.peach,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  cleanupButtonDisabled: {
    opacity: 0.55,
  },
  cleanupButtonLabel: {
    ...typography.button,
    color: colors.text,
  },
  copyButtonPressed: {
    opacity: 0.85,
  },
  copyButtonLabel: {
    ...typography.button,
    color: colors.text,
  },
  row: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowOk: {
    backgroundColor: colors.white,
  },
  rowFail: {
    backgroundColor: 'rgba(237, 134, 165, 0.12)',
  },
  rowTitle: {
    ...typography.stat,
    textAlign: 'right',
  },
  rowDetail: {
    ...typography.caption,
    textAlign: 'right',
    marginTop: 4,
    color: colors.pink,
  },
  back: {
    marginTop: 12,
    alignSelf: 'center',
    padding: 12,
  },
  backText: {
    ...typography.stat,
    color: colors.primary,
  },
});
