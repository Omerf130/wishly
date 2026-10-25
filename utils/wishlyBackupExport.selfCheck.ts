/**
 * Run: npx tsx utils/wishlyBackupExport.selfCheck.ts
 */
import { unzipSync } from 'fflate';

import { BACKUP_DREAMS_SQL, BACKUP_SAVINGS_TRANSACTIONS_SQL } from '@/database/backupSnapshotSql';
import type { WishlyBackupSnapshot } from '@/database/backupSnapshotTypes';
import { assembleWishlyBackupZip } from '@/utils/wishlyBackup/buildArchive';
import {
  collectUniqueLocalImageReferences,
  dreamIdsSet,
  filterTransactionsLinkedToDreams,
} from '@/utils/wishlyBackup/collectImages';
import { assertSafeLocalDreamImageReference } from '@/utils/wishlyBackup/pathSecurity';
import { runSha256VectorSelfCheck } from '@/utils/wishlyBackup/sha256.selfCheck';
import { sha256Hex, sha256HexFromUtf8 } from '@/utils/wishlyBackup/sha256';
import { BackupExportError } from '@/utils/wishlyBackup/errors';
import type { DreamRecord, SavingsTransactionRecord } from '@/types/database';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function dream(partial: Partial<DreamRecord> & Pick<DreamRecord, 'id'>): DreamRecord {
  return {
    title: 'חלום',
    description: null,
    targetAmount: 10_000,
    imageType: 'builtIn',
    imageReference: 'car',
    accentColor: 'primary',
    monthlySavingsAgorot: 5000,
    targetDate: '2026-12-01',
    status: 'active',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...partial,
  };
}

function tx(partial: Partial<SavingsTransactionRecord> & Pick<SavingsTransactionRecord, 'id'>): SavingsTransactionRecord {
  return {
    dreamId: 'd1',
    type: 'deposit',
    amount: 2500,
    note: null,
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-02T08:00:00.000Z',
    ...partial,
  };
}

async function testEmptyBackup(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [],
    savingsTransactions: [],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  assertEqual(assembled.dreamCount, 0, 'empty dreamCount');
  assertEqual(assembled.imageCount, 0, 'empty imageCount');
  const files = unzipSync(assembled.zipBytes);
  assert('manifest.json' in files, 'empty zip manifest');
  assert('data.json' in files, 'empty zip data');
}

async function testBuiltInDream(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [dream({ id: 'd-builtin', imageType: 'builtIn', imageReference: 'vacation' })],
    savingsTransactions: [],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  assertEqual(assembled.imageCount, 0, 'built-in no image files');
  const files = unzipSync(assembled.zipBytes);
  const data = JSON.parse(new TextDecoder().decode(files['data.json']!));
  assertEqual(data.dreams[0].imageReference, 'vacation', 'built-in id preserved');
}

async function testLocalImageAndChecksums(): Promise<void> {
  const ref = 'dream-images/aaa111.jpg';
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [dream({ id: 'd-local', imageType: 'local', imageReference: ref })],
    savingsTransactions: [tx({ id: 't1', dreamId: 'd-local', amount: 999 })],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [{ imageReference: ref, bytes }],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  const files = unzipSync(assembled.zipBytes);
  const archivePath = 'images/dream-images/aaa111.jpg';
  assert(files[archivePath] !== undefined, 'image in zip');
  const dataText = new TextDecoder().decode(files['data.json']!);
  const dataHash = await sha256HexFromUtf8(dataText);
  assertEqual(assembled.manifest.dataJson.sha256, dataHash, 'data.json checksum');
  const imageHash = await sha256Hex(bytes);
  assertEqual(assembled.manifest.images[0]!.sha256, imageHash, 'image checksum');
  assertEqual(assembled.manifest.images[0]!.imageReference, ref, 'image reference link');
}

async function testSharedImageOnce(): Promise<void> {
  const ref = 'dream-images/shared.webp';
  const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [
      dream({ id: 'd1', imageType: 'local', imageReference: ref }),
      dream({ id: 'd2', imageType: 'local', imageReference: ref }),
    ],
    savingsTransactions: [],
  };
  assertEqual(collectUniqueLocalImageReferences(snapshot.dreams).length, 1, 'dedupe refs');
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [{ imageReference: ref, bytes }],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  assertEqual(assembled.imageCount, 1, 'one image file');
}

async function testArchivedCompleted(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [
      dream({ id: 'd-arch', status: 'archived' }),
      dream({ id: 'd-done', status: 'completed', imageReference: 'house' }),
    ],
    savingsTransactions: [tx({ id: 't-arch', dreamId: 'd-arch' })],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  assertEqual(assembled.transactionCount, 1, 'archived dream tx kept');
  const data = JSON.parse(new TextDecoder().decode(unzipSync(assembled.zipBytes)['data.json']!));
  assertEqual(data.dreams.length, 2, 'all statuses exported');
}

function testOrphansExcludedFromSnapshotSql(): void {
  assert(BACKUP_SAVINGS_TRANSACTIONS_SQL.includes('INNER JOIN dreams'), 'join dreams');
  assert(!BACKUP_DREAMS_SQL.includes('WHERE'), 'all dreams');
  const dreams = [dream({ id: 'd1' })];
  const ids = dreamIdsSet(dreams);
  const filtered = filterTransactionsLinkedToDreams(
    [tx({ id: 'ok', dreamId: 'd1' }), tx({ id: 'orph', dreamId: 'missing' })],
    ids,
  );
  assertEqual(filtered.length, 1, 'orphan tx filtered');
  assertEqual(filtered[0]!.id, 'ok', 'linked tx kept');
}

async function testAgorotAndPlanningFields(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [
      dream({
        id: 'plan',
        targetAmount: 123456,
        monthlySavingsAgorot: 7890,
        targetDate: '2027-03-15',
      }),
    ],
    savingsTransactions: [tx({ id: 't-ag', amount: 123456 })],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  const data = JSON.parse(new TextDecoder().decode(unzipSync(assembled.zipBytes)['data.json']!));
  assertEqual(data.dreams[0].targetAmount, 123456, 'agorot target');
  assertEqual(data.dreams[0].monthlySavingsAgorot, 7890, 'monthly plan');
  assertEqual(data.dreams[0].targetDate, '2027-03-15', 'target date');
  assertEqual(data.savingsTransactions[0].amount, 123456, 'tx agorot');
}

async function testMissingImageFails(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [dream({ id: 'd', imageType: 'local', imageReference: 'dream-images/missing.jpg' })],
    savingsTransactions: [],
  };
  let failed = false;
  try {
    await assembleWishlyBackupZip({
      snapshot,
      images: [],
      appVersion: '1.0.0',
      createdAt: '2026-06-01T10:00:00.000Z',
    });
  } catch (error) {
    failed = error instanceof BackupExportError;
  }
  assert(failed, 'missing image fails');
}

function testUnsafePath(): void {
  const badPaths = ['../etc/passwd', 'dream-images/../x.jpg', 'other/x.jpg', 'dream-images/a/b.jpg'];
  for (const path of badPaths) {
    let threw = false;
    try {
      assertSafeLocalDreamImageReference(path);
    } catch (error) {
      threw = error instanceof BackupExportError;
    }
    assert(threw, `unsafe path blocked: ${path}`);
  }
  assertEqual(assertSafeLocalDreamImageReference('dream-images/ok-1.jpg'), 'dream-images/ok-1.jpg', 'safe path');
}

async function testZipStructureAndManifest(): Promise<void> {
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [dream({ id: 'd1' })],
    savingsTransactions: [],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  const files = unzipSync(assembled.zipBytes);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']!));
  assertEqual(manifest.format, 'wishly.backup', 'format id');
  assertEqual(manifest.backupVersion, 1, 'backup version');
  assertEqual(manifest.schemaVersion, 2, 'schema version');
  assertEqual(manifest.applicationId, 'wishly', 'app id');
  assert(manifest.encrypted === false, 'not encrypted');
  assertEqual(manifest.dreamCount, 1, 'manifest dream count');
}

async function testReadZipInMemory(): Promise<void> {
  const ref = 'dream-images/read-back.bin';
  const bytes = new Uint8Array([1, 2, 3]);
  const snapshot: WishlyBackupSnapshot = {
    schemaVersion: 2,
    dreams: [dream({ id: 'x', imageType: 'local', imageReference: ref })],
    savingsTransactions: [],
  };
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: [{ imageReference: ref, bytes }],
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  const entries = unzipSync(assembled.zipBytes);
  assertEqual(Object.keys(entries).length, 3, 'manifest data image');
  const roundTrip = entries['images/dream-images/read-back.bin'];
  assertEqual(roundTrip?.byteLength, 3, 'image bytes round trip');
}

async function run(): Promise<void> {
  await runSha256VectorSelfCheck();
  await testEmptyBackup();
  await testBuiltInDream();
  await testLocalImageAndChecksums();
  await testSharedImageOnce();
  await testArchivedCompleted();
  testOrphansExcludedFromSnapshotSql();
  await testAgorotAndPlanningFields();
  await testMissingImageFails();
  testUnsafePath();
  await testZipStructureAndManifest();
  await testReadZipInMemory();
  console.log('wishlyBackupExport.selfCheck: all passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
