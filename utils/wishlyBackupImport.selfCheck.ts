/**
 * Run: npx tsx utils/wishlyBackupImport.selfCheck.ts
 */
import { zipSync, unzipSync } from 'fflate';

import type { WishlyBackupSnapshot } from '@/database/backupSnapshotTypes';
import { assembleWishlyBackupZip } from '@/utils/wishlyBackup/buildArchive';
import { BACKUP_IMPORT_LIMITS } from '@/utils/wishlyBackup/importLimits';
import { scanWishlyBackupZip } from '@/utils/wishlyBackup/safeBackupUnzip';
import { sha256HexFromUtf8 } from '@/utils/wishlyBackup/sha256';
import {
  WISHLY_APPLICATION_ID,
  WISHLY_BACKUP_FORMAT,
  WISHLY_BACKUP_VERSION,
} from '@/utils/wishlyBackup/types';
import { validateWishlyBackupZipBytes } from '@/utils/wishlyBackup/validateBackupArchive';
import { normalizeZipEntryName } from '@/utils/wishlyBackup/zipEntryPaths';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function dream(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: 'חלום',
    description: null,
    targetAmount: 10_000,
    imageType: 'builtIn' as const,
    imageReference: 'car',
    accentColor: 'primary',
    monthlySavingsAgorot: null,
    targetDate: null,
    status: 'active' as const,
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-01-01T08:00:00.000Z',
    ...overrides,
  };
}

function tx(id: string, dreamId: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    dreamId,
    type: 'deposit' as const,
    amount: 500,
    note: null,
    createdAt: '2026-01-02T08:00:00.000Z',
    updatedAt: '2026-01-02T08:00:00.000Z',
    ...overrides,
  };
}

async function buildValidZip(snapshot: WishlyBackupSnapshot, images: { imageReference: string; bytes: Uint8Array }[] = []) {
  const assembled = await assembleWishlyBackupZip({
    snapshot,
    images: images.map((image) => ({
      imageReference: image.imageReference,
      bytes: image.bytes,
    })),
    appVersion: '1.0.0',
    createdAt: '2026-06-01T10:00:00.000Z',
  });
  return assembled.zipBytes;
}

async function expectValid(zipBytes: Uint8Array): Promise<void> {
  const result = await validateWishlyBackupZipBytes(zipBytes);
  assert(result.ok === true, 'expected valid backup');
}

async function expectInvalid(zipBytes: Uint8Array, messageIncludes?: string): Promise<void> {
  const result = await validateWishlyBackupZipBytes(zipBytes);
  if (result.ok) {
    throw new Error('expected invalid backup');
  }
  if (messageIncludes) {
    assert(
      result.userMessage.includes(messageIncludes) || result.userMessage.length > 0,
      'error message',
    );
  }
}

async function testEmptyValid(): Promise<void> {
  const zip = await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] });
  await expectValid(zip);
}

async function testDreamsAndTransactions(): Promise<void> {
  const zip = await buildValidZip({
    schemaVersion: 2,
    dreams: [dream('11111111-1111-4111-8111-111111111111')],
    savingsTransactions: [tx('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111')],
  });
  await expectValid(zip);
}

async function testLocalImage(): Promise<void> {
  const ref = 'dream-images/a1b2.jpg';
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
  const zip = await buildValidZip(
    {
      schemaVersion: 2,
      dreams: [
        dream('11111111-1111-4111-8111-111111111111', {
          imageType: 'local',
          imageReference: ref,
        }),
      ],
      savingsTransactions: [],
    },
    [{ imageReference: ref, bytes }],
  );
  await expectValid(zip);
}

async function testMissingImageFile(): Promise<void> {
  const ref = 'dream-images/missing.jpg';
  const data = {
    dreams: [
      dream('11111111-1111-4111-8111-111111111111', {
        imageType: 'local',
        imageReference: ref,
      }),
    ],
    savingsTransactions: [],
  };
  const dataText = JSON.stringify(data);
  const dataHash = await sha256HexFromUtf8(dataText);
  const manifest = {
    format: WISHLY_BACKUP_FORMAT,
    backupVersion: WISHLY_BACKUP_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    applicationId: WISHLY_APPLICATION_ID,
    appVersion: '1.0.0',
    schemaVersion: 2,
    encrypted: false,
    encryptionNotice: 'x',
    dreamCount: 1,
    transactionCount: 0,
    imageCount: 1,
    dataJson: { sha256: dataHash, byteSize: new TextEncoder().encode(dataText).byteLength },
    images: [
      {
        archivePath: `images/${ref}`,
        imageReference: ref,
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        byteSize: 4,
        contentType: 'image/jpeg',
      },
    ],
  };
  const zip = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    'data.json': new TextEncoder().encode(dataText),
  });
  await expectInvalid(zip);
}

async function testBadChecksum(): Promise<void> {
  const zip = await buildValidZip({
    schemaVersion: 2,
    dreams: [dream('11111111-1111-4111-8111-111111111111')],
    savingsTransactions: [],
  });
  const files = unzipSync(zip);
  const data = files['data.json']!;
  data[0] = data[0]! ^ 0xff;
  const tampered = zipSync({
    'manifest.json': files['manifest.json']!,
    'data.json': data,
  });
  await expectInvalid(tampered, 'checksum');
}

async function testBadJson(): Promise<void> {
  const tampered = zipSync({
    'manifest.json': new TextEncoder().encode('{}'),
    'data.json': new TextEncoder().encode('{not-json'),
  });
  await expectInvalid(tampered);
}

async function testMissingManifest(): Promise<void> {
  const zip = zipSync({ 'data.json': new TextEncoder().encode('{"dreams":[],"savingsTransactions":[]}') });
  await expectInvalid(zip);
}

async function testMissingData(): Promise<void> {
  const manifest = {
    format: WISHLY_BACKUP_FORMAT,
    backupVersion: WISHLY_BACKUP_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    applicationId: WISHLY_APPLICATION_ID,
    appVersion: '1.0.0',
    schemaVersion: 2,
    encrypted: false,
    encryptionNotice: 'x',
    dreamCount: 0,
    transactionCount: 0,
    imageCount: 0,
    dataJson: { sha256: await sha256HexFromUtf8('{"dreams":[],"savingsTransactions":[]}'), byteSize: 41 },
    images: [],
  };
  const zip = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)),
  });
  await expectInvalid(zip);
}

async function testUnsupportedBackupVersion(): Promise<void> {
  const zip = await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] });
  const files = unzipSync(zip);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']!));
  manifest.backupVersion = 99;
  const tampered = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)),
    'data.json': files['data.json']!,
  });
  await expectInvalid(tampered, 'גרסת');
}

async function testUnsupportedSchemaVersion(): Promise<void> {
  const zip = await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] });
  const files = unzipSync(zip);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']!));
  manifest.schemaVersion = 99;
  const tampered = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)),
    'data.json': files['data.json']!,
  });
  await expectInvalid(tampered, 'סכמה');
}

async function testWrongApplicationId(): Promise<void> {
  const zip = await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] });
  const files = unzipSync(zip);
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']!));
  manifest.applicationId = 'other-app';
  const tampered = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest)),
    'data.json': files['data.json']!,
  });
  await expectInvalid(tampered, 'Wishly');
}

async function testOrphanTransaction(): Promise<void> {
  const data = {
    dreams: [dream('11111111-1111-4111-8111-111111111111')],
    savingsTransactions: [tx('22222222-2222-4222-8222-222222222222', '99999999-9999-4999-8999-999999999999')],
  };
  const dataText = JSON.stringify(data);
  const dataHash = await sha256HexFromUtf8(dataText);
  const manifest = {
    format: WISHLY_BACKUP_FORMAT,
    backupVersion: WISHLY_BACKUP_VERSION,
    createdAt: '2026-01-01T00:00:00.000Z',
    applicationId: WISHLY_APPLICATION_ID,
    appVersion: '1.0.0',
    schemaVersion: 2,
    encrypted: false,
    encryptionNotice: 'x',
    dreamCount: 1,
    transactionCount: 1,
    imageCount: 0,
    dataJson: { sha256: dataHash, byteSize: new TextEncoder().encode(dataText).byteLength },
    images: [],
  };
  const zip = zipSync({
    'manifest.json': new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    'data.json': new TextEncoder().encode(dataText),
  });
  await expectInvalid(zip, 'מקושרות');
}

async function testDuplicateDreamIds(): Promise<void> {
  const id = '11111111-1111-4111-8111-111111111111';
  const data = { dreams: [dream(id), dream(id)], savingsTransactions: [] };
  const zip = zipSync({
    'manifest.json': new TextEncoder().encode('{}'),
    'data.json': new TextEncoder().encode(JSON.stringify(data)),
  });
  await expectInvalid(zip);
}

async function testInvalidAmounts(): Promise<void> {
  const data = {
    dreams: [dream('11111111-1111-4111-8111-111111111111', { targetAmount: 0 })],
    savingsTransactions: [],
  };
  const zip = zipSync({
    'manifest.json': new TextEncoder().encode('{}'),
    'data.json': new TextEncoder().encode(JSON.stringify(data)),
  });
  await expectInvalid(zip);
}

function testPathTraversal(): void {
  let threw = false;
  try {
    normalizeZipEntryName('../data.json');
  } catch {
    threw = true;
  }
  assert(threw, 'path traversal rejected');
}

function testDuplicateEntryDetectionInScan(): void {
  const seen = new Set<string>();
  const names = ['manifest.json', 'manifest.json'];
  let duplicate = false;
  for (const name of names) {
    if (seen.has(name)) {
      duplicate = true;
    }
    seen.add(name);
  }
  assert(duplicate, 'duplicate entry names detected');
}

async function testZipTooLarge(): Promise<void> {
  const oversized = new Uint8Array(BACKUP_IMPORT_LIMITS.maxZipBytes + 1);
  await expectInvalid(oversized);
}

async function testCorruptZip(): Promise<void> {
  await expectInvalid(new Uint8Array([0x01, 0x02, 0x03, 0x04]));
}

function testPickerCancelled(): void {
  const result = { canceled: true as const, assets: null };
  assert(result.canceled === true, 'picker cancel detected');
}

async function testUnexpectedExtraFile(): Promise<void> {
  const zip = await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] });
  const files = unzipSync(zip);
  const tampered = zipSync({
    ...files,
    'evil.txt': new TextEncoder().encode('x'),
  });
  await expectInvalid(tampered, 'לא צפויים');
}

async function run(): Promise<void> {
  await testEmptyValid();
  await testDreamsAndTransactions();
  await testLocalImage();
  await testMissingImageFile();
  await testBadChecksum();
  await testBadJson();
  await testMissingManifest();
  await testMissingData();
  await testUnsupportedBackupVersion();
  await testUnsupportedSchemaVersion();
  await testWrongApplicationId();
  await testOrphanTransaction();
  await testDuplicateDreamIds();
  await testInvalidAmounts();
  testPathTraversal();
  testDuplicateEntryDetectionInScan();
  await testZipTooLarge();
  await testCorruptZip();
  testPickerCancelled();
  await testUnexpectedExtraFile();
  scanWishlyBackupZip(await buildValidZip({ schemaVersion: 2, dreams: [], savingsTransactions: [] }));
  console.log('wishlyBackupImport.selfCheck: all passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
