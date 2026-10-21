import { DATABASE_NAME } from '@/database/constants';
import { getDatabase, resetDatabaseSingletonForTests } from '@/database/client';
import {
  archiveDream,
  createDream,
  deleteDream,
  getDreamById,
  listDreams,
} from '@/database/dreamsRepository';
import { areForeignKeysEnabled } from '@/database/foreignKeys';
import { runMigrations } from '@/database/migrations';
import {
  CORE_USER_TABLES,
  ensureCoreSchemaPresent,
  listUserTableNames,
  readDatabaseList,
} from '@/database/schema';
import { NotFoundError, ValidationError } from '@/database/errors';
import {
  buildOrphanTransactionsReport,
  formatOrphanTransactionsReport,
  type OrphanTransactionsReport,
} from '@/database/orphans';
import {
  addDeposit,
  addWithdrawal,
  deleteTransaction,
  getSavedAmountForDream,
  listTransactionsByDream,
  updateTransaction,
} from '@/database/transactionsRepository';
import type { SQLiteDatabase } from 'expo-sqlite';

export type SelfTestResult = {
  name: string;
  passed: boolean;
  detail?: string;
};

export type ForeignKeyListRow = {
  id: number;
  seq: number;
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
  match: string;
};

export type ForeignKeyCheckRow = {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
};

/** Dev-only diagnostic bundle for the cascade delete self-test step. */
export type CascadeDeleteDiagnostic = {
  dreamId: string;
  databaseName: string;
  databasePath: string | null;
  foreignKeysPragmaBeforeDelete: number | null;
  foreignKeysPragmaAfterDelete: number | null;
  foreignKeysHelperBeforeDelete: boolean | null;
  savingsTransactionsTableSql: string | null;
  foreignKeyList: ForeignKeyListRow[];
  onDeleteAction: string | null;
  dreamExistsBeforeDelete: boolean;
  sqlTxCountBeforeDelete: number;
  repositoryTxCountBeforeDelete: number;
  repositorySqlMismatchBeforeDelete: boolean;
  deleteDreamThrew: boolean;
  deleteDreamError: string | null;
  sqlDreamCountAfterDelete: number;
  sqlTxCountAfterDelete: number;
  repositoryTxCountAfterDelete: number;
  repositorySqlMismatchAfterDelete: boolean;
  foreignKeyCheckAfterDelete: ForeignKeyCheckRow[];
  totalOrphanTransactionsInDb: number;
  /** SQL-only: dream + its txs removed for this test dream_id. */
  cascadeTestPassed: boolean;
  cascadeAssertionError: string | null;
  repositoryQueryErrorAfterDelete: string | null;
  repositoryNotFoundAfterDeleteExpected: boolean;
  /** Historical orphans / FK check — separate from cascadeTestPassed. */
  databaseIntegrityNote: string | null;
  cleanupFailures: string[];
};

export type WishlyDatabaseSelfTestOutput = {
  results: SelfTestResult[];
  cascadeDeleteDiagnostic: CascadeDeleteDiagnostic | null;
  orphanReportBeforeCascade: OrphanTransactionsReport | null;
};

const OPENING_BALANCE_NOTE = 'יתרת פתיחה';
const TEST_DREAM_TITLE = '[DEV-SELFTEST] בדיקת SQLite';
const DECOY_DREAM_TITLE = '[DEV-SELFTEST-DECOY]';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeSqlCount(value: number | string | null | undefined): number {
  if (value == null) {
    return 0;
  }
  return typeof value === 'number' ? value : Number(value);
}

async function sqlCountAllOrphanTransactions(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number | string }>(
    `SELECT COUNT(*) AS count FROM savings_transactions st
     WHERE NOT EXISTS (SELECT 1 FROM dreams d WHERE d.id = st.dream_id);`,
  );
  return normalizeSqlCount(row?.count);
}

async function readForeignKeysPragma(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys;');
  return row?.foreign_keys ?? null;
}

async function readForeignKeyList(db: SQLiteDatabase): Promise<ForeignKeyListRow[]> {
  return db.getAllAsync<ForeignKeyListRow>('PRAGMA foreign_key_list(savings_transactions);');
}

async function readForeignKeyCheck(db: SQLiteDatabase): Promise<ForeignKeyCheckRow[]> {
  return db.getAllAsync<ForeignKeyCheckRow>('PRAGMA foreign_key_check;');
}

async function readSavingsTransactionsSchema(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ sql: string | null }>(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'savings_transactions';`,
  );
  return row?.sql ?? null;
}

async function sqlCountDreamsById(db: SQLiteDatabase, dreamId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number | string }>(
    'SELECT COUNT(*) AS count FROM dreams WHERE id = ?;',
    dreamId,
  );
  return normalizeSqlCount(row?.count);
}

async function sqlCountTransactionsByDreamId(db: SQLiteDatabase, dreamId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number | string }>(
    'SELECT COUNT(*) AS count FROM savings_transactions WHERE dream_id = ?;',
    dreamId,
  );
  return normalizeSqlCount(row?.count);
}

async function countTransactionsForDream(db: SQLiteDatabase, dreamId: string): Promise<number> {
  const rows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM savings_transactions WHERE dream_id = ?',
    dreamId,
  );
  return rows.length;
}

async function collectCascadeEnvironment(db: SQLiteDatabase): Promise<{
  foreignKeysPragma: number | null;
  foreignKeysHelper: boolean;
  savingsTransactionsTableSql: string | null;
  foreignKeyList: ForeignKeyListRow[];
  onDeleteAction: string | null;
  foreignKeyCheck: ForeignKeyCheckRow[];
}> {
  const foreignKeysPragma = await readForeignKeysPragma(db);
  const foreignKeysHelper = await areForeignKeysEnabled(db);
  const savingsTransactionsTableSql = await readSavingsTransactionsSchema(db);
  const foreignKeyList = await readForeignKeyList(db);
  const onDeleteAction = foreignKeyList[0]?.on_delete ?? null;
  const foreignKeyCheck = await readForeignKeyCheck(db);
  return {
    foreignKeysPragma,
    foreignKeysHelper,
    savingsTransactionsTableSql,
    foreignKeyList,
    onDeleteAction,
    foreignKeyCheck,
  };
}

/**
 * Plain-text report for sharing / long-press copy on the dev SQLite screen.
 */
export function formatCascadeDeleteDiagnosticReport(diag: CascadeDeleteDiagnostic): string {
  const lines: string[] = [
    '=== Wishly — פרטי אבחון מחיקת חלום (CP4A.3) ===',
    `database: ${diag.databaseName}`,
    `databasePath: ${diag.databasePath ?? '(unknown)'}`,
    `dreamId: ${diag.dreamId}`,
    '',
    '--- Foreign keys ---',
    `PRAGMA foreign_keys (before delete): ${diag.foreignKeysPragmaBeforeDelete ?? 'null'}`,
    `PRAGMA foreign_keys (after delete): ${diag.foreignKeysPragmaAfterDelete ?? 'null'}`,
    `areForeignKeysEnabled() before delete: ${String(diag.foreignKeysHelperBeforeDelete)}`,
    '',
    '--- Schema (sqlite_master) ---',
    diag.savingsTransactionsTableSql ?? '(no savings_transactions table sql)',
    '',
    '--- PRAGMA foreign_key_list(savings_transactions) ---',
    JSON.stringify(diag.foreignKeyList, null, 2),
    `ON DELETE (parsed): ${diag.onDeleteAction ?? '(none)'}`,
    '',
    '--- Before deleteDream ---',
    `dream exists (getDreamById): ${diag.dreamExistsBeforeDelete}`,
    `SQL tx count: ${diag.sqlTxCountBeforeDelete}`,
    `listTransactionsByDream count: ${diag.repositoryTxCountBeforeDelete}`,
    `repository vs SQL mismatch: ${diag.repositorySqlMismatchBeforeDelete}`,
    '',
    '--- deleteDream ---',
    `threw: ${diag.deleteDreamThrew}`,
    diag.deleteDreamError ?? '(no error)',
    '',
    '--- After deleteDream (same db handle) ---',
    `SQL dreams COUNT for id: ${diag.sqlDreamCountAfterDelete}`,
    `SQL tx COUNT for dream_id: ${diag.sqlTxCountAfterDelete}`,
    `listTransactionsByDream count: ${diag.repositoryTxCountAfterDelete}`,
    `repository vs SQL mismatch: ${diag.repositorySqlMismatchAfterDelete}`,
    '',
    '--- PRAGMA foreign_key_check (after delete) ---',
    JSON.stringify(diag.foreignKeyCheckAfterDelete, null, 2),
    '',
    '--- Cascade verification (this test dream only) ---',
    `cascadeTestPassed: ${diag.cascadeTestPassed}`,
    diag.cascadeAssertionError ?? '(no cascade failure)',
    '',
    '--- Repository after delete (informational) ---',
    diag.repositoryNotFoundAfterDeleteExpected
      ? `listTransactionsByDream: NotFoundError (expected — dream deleted)`
      : `listTransactionsByDream: ${diag.repositoryQueryErrorAfterDelete ?? 'ok'}`,
    '',
    '--- Database integrity (global, separate metric) ---',
    diag.databaseIntegrityNote ?? '',
    `totalOrphanTransactionsInDb: ${diag.totalOrphanTransactionsInDb}`,
  ].filter(Boolean);

  if (diag.cleanupFailures.length > 0) {
    lines.push('', '--- Cleanup failures ---', ...diag.cleanupFailures);
  }

  return lines.join('\n');
}

/**
 * Integration self-test on the real `wishly.db`.
 * Creates tagged dreams, runs CRUD/transaction checks, then removes only those dreams.
 */
export async function runWishlyDatabaseSelfTest(): Promise<WishlyDatabaseSelfTestOutput> {
  const results: SelfTestResult[] = [];
  let testDreamId: string | null = null;
  let decoyDreamId: string | null = null;
  let baselineDreamCount = 0;
  const cascadeDiagnosticRef: { value: CascadeDeleteDiagnostic | null } = { value: null };
  const cascadeCleanupFailures: string[] = [];
  let orphanReportBeforeCascade: OrphanTransactionsReport | null = null;

  const run = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (error) {
      results.push({
        name,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const runInfo = async (name: string, fn: () => Promise<string | undefined>) => {
    try {
      const detail = await fn();
      results.push({ name, passed: true, detail });
    } catch (error) {
      results.push({
        name,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  };

  try {
    const db = await getDatabase();

    await run(`open ${DATABASE_NAME}`, async () => {
      assert(Boolean(db.databasePath), 'database path missing');
    });

    await run('PRAGMA foreign_keys is ON after open', async () => {
      assert(await areForeignKeysEnabled(db), 'foreign_keys is not enabled');
    });

    await run('run migrations (idempotent)', async () => {
      await runMigrations(db);
      await runMigrations(db);
      const versions = await db.getAllAsync<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version',
      );
      assert(versions.length >= 1, 'expected schema version row');
      assert(await areForeignKeysEnabled(db), 'foreign_keys off after migrations');
    });

    await run('core tables exist on main connection after migrations', async () => {
      await ensureCoreSchemaPresent(db);
      const tables = await listUserTableNames(db);
      for (const required of CORE_USER_TABLES) {
        assert(tables.includes(required), `missing table ${required} on main db`);
      }
      const dbList = await readDatabaseList(db);
      assert(dbList.length >= 1, 'PRAGMA database_list empty');
      assert(Boolean(db.databasePath), 'main databasePath missing');
      const mainEntry = dbList.find((entry) => entry.file && entry.file !== '');
      assert(Boolean(mainEntry?.file), 'database_list has no file path');
    });

    baselineDreamCount = (await listDreams(db)).length;

    await run('create test dream with opening balance', async () => {
      const dream = await createDream(db, {
        title: TEST_DREAM_TITLE,
        targetAmountAgorot: 1_000_000,
        imageType: 'builtIn',
        imageReference: 'car',
        accentColor: 'primary',
        initialSavedAmountAgorot: 100_000,
      });
      testDreamId = dream.id;
      const balance = await getSavedAmountForDream(db, dream.id);
      assert(balance === 100_000, `balance expected 100000 got ${balance}`);
      assert((await countTransactionsForDream(db, dream.id)) >= 1, 'missing opening tx');
    });

    if (!testDreamId) {
      return { results, cascadeDeleteDiagnostic: cascadeDiagnosticRef.value, orphanReportBeforeCascade };
    }

    const dreamId = testDreamId;

    await run('add deposit', async () => {
      await addDeposit(db, { dreamId, amountAgorot: 50_000 });
      const balance = await getSavedAmountForDream(db, dreamId);
      assert(balance === 150_000, `balance expected 150000 got ${balance}`);
    });

    await run('add withdrawal', async () => {
      await addWithdrawal(db, { dreamId, amountAgorot: 20_000 });
      const balance = await getSavedAmountForDream(db, dreamId);
      assert(balance === 130_000, `balance expected 130000 got ${balance}`);
    });

    await run('reject withdrawal above balance', async () => {
      let rejected = false;
      try {
        await addWithdrawal(db, { dreamId, amountAgorot: 999_999_999 });
      } catch (error) {
        rejected = error instanceof ValidationError;
      }
      assert(rejected, 'expected validation failure');
    });

    await run('update transaction', async () => {
      const txs = await listTransactionsByDream(db, dreamId);
      const deposit = txs.find(
        (tx) => tx.type === 'deposit' && tx.note !== OPENING_BALANCE_NOTE,
      );
      assert(Boolean(deposit), 'deposit tx missing');
      await updateTransaction(db, deposit!.id, { amountAgorot: 60_000 });
      const balance = await getSavedAmountForDream(db, dreamId);
      assert(balance === 140_000, `balance expected 140000 got ${balance}`);
    });

    await run('delete transaction', async () => {
      const txs = await listTransactionsByDream(db, dreamId);
      const withdrawal = txs.find((tx) => tx.type === 'withdrawal');
      assert(Boolean(withdrawal), 'withdrawal tx missing');
      await deleteTransaction(db, withdrawal!.id);
      const balance = await getSavedAmountForDream(db, dreamId);
      assert(balance === 160_000, `balance expected 160000 got ${balance}`);
    });

    await run('archive test dream', async () => {
      const archived = await archiveDream(db, dreamId);
      assert(archived.status === 'archived', 'dream not archived');
    });

    await run('create decoy dream (other transactions isolation)', async () => {
      const decoy = await createDream(db, {
        title: DECOY_DREAM_TITLE,
        targetAmountAgorot: 500_000,
        imageType: 'builtIn',
        imageReference: 'house',
        accentColor: 'pink',
        initialSavedAmountAgorot: 5_000,
      });
      decoyDreamId = decoy.id;
      assert((await countTransactionsForDream(db, decoy.id)) >= 1, 'decoy missing txs');
    });

    await run('re-open database without losing test data', async () => {
      const balanceBefore = await getSavedAmountForDream(db, dreamId);
      resetDatabaseSingletonForTests();
      const dbAgain = await getDatabase();
      assert(await areForeignKeysEnabled(dbAgain), 'foreign_keys off after reopen');
      const dream = await getDreamById(dbAgain, dreamId);
      assert(dream !== null, 'test dream missing after reopen');
      const balanceAfter = await getSavedAmountForDream(dbAgain, dreamId);
      assert(balanceAfter === balanceBefore, 'balance changed after reopen');
    });

    await runInfo('orphan transactions before cascade (informational)', async () => {
      orphanReportBeforeCascade = await buildOrphanTransactionsReport(db);
      const summary = `${orphanReportBeforeCascade.totalCount} יתומות (${orphanReportBeforeCascade.provablyDevSelfTestCount} מסומנות [DEV-SELFTEST] בהערה, ${orphanReportBeforeCascade.unclassifiedCount} דורשות סקירה)`;
      if (orphanReportBeforeCascade.totalCount > 0) {
        return `${summary}\n${formatOrphanTransactionsReport(orphanReportBeforeCascade).slice(0, 2000)}`;
      }
      return summary;
    });

    await run('delete dream cascades transactions (FK)', async () => {
      const dbLive = await getDatabase();
      if (!orphanReportBeforeCascade) {
        orphanReportBeforeCascade = await buildOrphanTransactionsReport(dbLive);
      }
      const envBefore = await collectCascadeEnvironment(dbLive);

      const dreamBefore = await getDreamById(dbLive, dreamId);
      const sqlTxBefore = await sqlCountTransactionsByDreamId(dbLive, dreamId);
      const repoTxBefore = (await listTransactionsByDream(dbLive, dreamId)).length;

      cascadeDiagnosticRef.value = {
        dreamId,
        databaseName: DATABASE_NAME,
        databasePath: dbLive.databasePath ?? null,
        foreignKeysPragmaBeforeDelete: envBefore.foreignKeysPragma,
        foreignKeysPragmaAfterDelete: null,
        foreignKeysHelperBeforeDelete: envBefore.foreignKeysHelper,
        savingsTransactionsTableSql: envBefore.savingsTransactionsTableSql,
        foreignKeyList: envBefore.foreignKeyList,
        onDeleteAction: envBefore.onDeleteAction,
        dreamExistsBeforeDelete: dreamBefore !== null,
        sqlTxCountBeforeDelete: sqlTxBefore,
        repositoryTxCountBeforeDelete: repoTxBefore,
        repositorySqlMismatchBeforeDelete: sqlTxBefore !== repoTxBefore,
        deleteDreamThrew: false,
        deleteDreamError: null,
        sqlDreamCountAfterDelete: -1,
        sqlTxCountAfterDelete: -1,
        repositoryTxCountAfterDelete: -1,
        repositorySqlMismatchAfterDelete: false,
        foreignKeyCheckAfterDelete: [],
        totalOrphanTransactionsInDb: 0,
        cascadeTestPassed: false,
        cascadeAssertionError: null,
        repositoryQueryErrorAfterDelete: null,
        repositoryNotFoundAfterDeleteExpected: false,
        databaseIntegrityNote: null,
        cleanupFailures: [],
      };

      assert(envBefore.foreignKeysPragma === 1, `foreign_keys PRAGMA is ${envBefore.foreignKeysPragma}`);
      assert(sqlTxBefore > 0, `expected txs before delete, got ${sqlTxBefore}`);

      const decoyTxBefore = decoyDreamId
        ? await countTransactionsForDream(dbLive, decoyDreamId)
        : 0;

      try {
        await deleteDream(dbLive, dreamId);
        testDreamId = null;
      } catch (error) {
        cascadeDiagnosticRef.value.deleteDreamThrew = true;
        cascadeDiagnosticRef.value.deleteDreamError =
          error instanceof Error ? error.message : String(error);
        throw error;
      }

      const diag = cascadeDiagnosticRef.value;
      diag.foreignKeysPragmaAfterDelete = await readForeignKeysPragma(dbLive);
      diag.sqlDreamCountAfterDelete = await sqlCountDreamsById(dbLive, dreamId);
      diag.sqlTxCountAfterDelete = await sqlCountTransactionsByDreamId(dbLive, dreamId);
      diag.foreignKeyCheckAfterDelete = await readForeignKeyCheck(dbLive);
      diag.totalOrphanTransactionsInDb = await sqlCountAllOrphanTransactions(dbLive);

      try {
        diag.repositoryTxCountAfterDelete = (
          await listTransactionsByDream(dbLive, dreamId)
        ).length;
        diag.repositoryNotFoundAfterDeleteExpected = false;
      } catch (error) {
        diag.repositoryQueryErrorAfterDelete =
          error instanceof Error ? error.message : String(error);
        diag.repositoryTxCountAfterDelete = -1;
        diag.repositoryNotFoundAfterDeleteExpected = error instanceof NotFoundError;
      }

      diag.repositorySqlMismatchAfterDelete =
        !diag.repositoryNotFoundAfterDeleteExpected &&
        diag.repositoryQueryErrorAfterDelete === null &&
        diag.sqlTxCountAfterDelete !== diag.repositoryTxCountAfterDelete;

      const fkCheckCount = diag.foreignKeyCheckAfterDelete.length;
      diag.databaseIntegrityNote = [
        diag.totalOrphanTransactionsInDb > 0
          ? `${diag.totalOrphanTransactionsInDb} orphan tx rows in DB (not part of cascade pass/fail)`
          : 'no orphan transactions in DB',
        fkCheckCount > 0
          ? `PRAGMA foreign_key_check: ${fkCheckCount} rows (often matches historical orphans)`
          : 'PRAGMA foreign_key_check: empty',
      ].join('; ');

      const verificationErrors: string[] = [];

      if (diag.deleteDreamThrew) {
        verificationErrors.push('deleteDream threw an error');
      }
      const dreamAfter = await getDreamById(dbLive, dreamId);
      if (dreamAfter !== null) {
        verificationErrors.push('dream still exists after deleteDream');
      }
      if (diag.sqlDreamCountAfterDelete !== 0) {
        verificationErrors.push(
          `SQL dreams COUNT expected 0 got ${diag.sqlDreamCountAfterDelete}`,
        );
      }
      if (diag.sqlTxCountAfterDelete !== 0) {
        verificationErrors.push(
          `transactions not deleted (${diag.sqlTxCountAfterDelete} left for dream_id)`,
        );
      }
      if (
        diag.repositoryQueryErrorAfterDelete &&
        !diag.repositoryNotFoundAfterDeleteExpected
      ) {
        verificationErrors.push(
          `listTransactionsByDream unexpected error: ${diag.repositoryQueryErrorAfterDelete}`,
        );
      } else if (
        !diag.repositoryNotFoundAfterDeleteExpected &&
        diag.repositoryTxCountAfterDelete !== 0
      ) {
        verificationErrors.push(
          `repository listed ${diag.repositoryTxCountAfterDelete} txs after dream delete`,
        );
      }

      if (decoyDreamId) {
        const decoyTxAfter = await countTransactionsForDream(dbLive, decoyDreamId);
        if (decoyTxAfter !== decoyTxBefore) {
          verificationErrors.push(
            `decoy transactions affected (${decoyTxBefore} -> ${decoyTxAfter})`,
          );
        }
      }

      diag.cascadeTestPassed = verificationErrors.length === 0;
      if (!diag.cascadeTestPassed) {
        diag.cascadeAssertionError = verificationErrors.join('; ');
        throw new Error(diag.cascadeAssertionError);
      }
    });
  } finally {
    const idsToCleanup: string[] = [];
    if (testDreamId) {
      idsToCleanup.push(testDreamId);
    }
    if (decoyDreamId) {
      idsToCleanup.push(decoyDreamId);
    }

    for (const id of idsToCleanup) {
      try {
        const db = await getDatabase();
        const stillThere = await getDreamById(db, id);
        if (stillThere) {
          await deleteDream(db, id);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          name: `cleanup test dream ${id}`,
          passed: false,
          detail: message,
        });
        cascadeCleanupFailures.push(`cleanup ${id}: ${message}`);
      }
    }

    if (decoyDreamId) {
      decoyDreamId = null;
    }
    if (testDreamId) {
      testDreamId = null;
    }

    try {
      const db = await getDatabase();
      const afterCount = (await listDreams(db)).length;
      const cleanupOk = afterCount === baselineDreamCount;
      results.push({
        name: 'cleanup preserves existing user dreams',
        passed: cleanupOk,
        detail: cleanupOk
          ? undefined
          : `dream count ${afterCount}, expected ${baselineDreamCount}`,
      });
    } catch (error) {
      results.push({
        name: 'cleanup preserves existing user dreams',
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (cascadeDiagnosticRef.value && cascadeCleanupFailures.length > 0) {
    cascadeDiagnosticRef.value.cleanupFailures.push(...cascadeCleanupFailures);
  }

  return {
    results,
    cascadeDeleteDiagnostic: cascadeDiagnosticRef.value,
    orphanReportBeforeCascade,
  };
}

export function summarizeSelfTestResults(results: SelfTestResult[]): {
  allPassed: boolean;
  passedCount: number;
  failedCount: number;
} {
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;
  return {
    allPassed: failedCount === 0 && results.length > 0,
    passedCount,
    failedCount,
  };
}
