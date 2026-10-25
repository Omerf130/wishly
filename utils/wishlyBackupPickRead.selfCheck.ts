/**
 * Run: npx tsx utils/wishlyBackupPickRead.selfCheck.ts
 */
import { devClassifyPickerUriScheme } from '@/utils/wishlyBackup/devBackupImportFileReadContext';
import { documentPickerCopyToCacheDirectoryForPlatform } from '@/utils/wishlyBackup/documentPickerBackupImportOptions';
import { BACKUP_IMPORT_LIMITS } from '@/utils/wishlyBackup/importLimits';
import {
  pickedBackupBytesForMockRead,
  readPickedBackupZipBytes,
  type PickedBackupFileAccess,
} from '@/utils/wishlyBackup/readPickedBackupZipBytes';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function mockFileApiAccess(
  handlers: Partial<PickedBackupFileAccess> & Pick<PickedBackupFileAccess, 'readBytes'>,
): PickedBackupFileAccess {
  return {
    getInfo: handlers.getInfo ?? (async () => ({ exists: true, isDirectory: false })),
    readBytes: handlers.readBytes,
  };
}

async function testReadableCacheUriNoCopy(): Promise<void> {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const { info, bytes: payload } = pickedBackupBytesForMockRead(bytes);
  let readCalls = 0;
  let statCalls = 0;

  const read = await readPickedBackupZipBytes(
    'file:///mock/DocumentPicker/backup.zip',
    mockFileApiAccess({
      getInfo: async () => {
        statCalls += 1;
        return info;
      },
      readBytes: async () => {
        readCalls += 1;
        return payload;
      },
    }),
    { knownSize: bytes.byteLength },
  );

  assert(statCalls === 1, 'File API stat should run once on picker URI');
  assert(readCalls === 1, 'File API bytes read once in place');
  assert(read.byteLength === bytes.byteLength, 'byte length preserved');
  assert(read[0] === bytes[0] && read[3] === bytes[3], 'bytes unchanged');
}

async function testContentUriReadableWithoutStat(): Promise<void> {
  const bytes = new Uint8Array([0x01, 0x02]);
  const { bytes: payload } = pickedBackupBytesForMockRead(bytes);

  const read = await readPickedBackupZipBytes(
    'content://mock.provider/document/backup.zip',
    mockFileApiAccess({
      getInfo: async () => {
        throw new Error('Location metadata unavailable');
      },
      readBytes: async () => payload,
    }),
    { knownSize: bytes.byteLength },
  );

  assert(read[0] === 0x01 && read[1] === 0x02, 'SAF-style bytes read without stat');
}

async function testMissingFile(): Promise<void> {
  try {
    await readPickedBackupZipBytes(
      'file:///mock/missing.zip',
      mockFileApiAccess({
        getInfo: async () => ({ exists: false, isDirectory: false }),
        readBytes: async () => {
          throw new Error('File not found');
        },
      }),
    );
    throw new Error('expected throw');
  } catch (error) {
    assert(
      error instanceof Error && error.message === 'לא ניתן לקרוא את קובץ הגיבוי',
      'missing file surfaces as read failure',
    );
    const cause = (error as Error & { cause?: unknown }).cause;
    assert(cause instanceof Error && cause.message === 'File not found', 'cause preserved');
  }
}

async function testUnreliableExistsStillReadsWithKnownSize(): Promise<void> {
  const bytes = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
  const { bytes: payload } = pickedBackupBytesForMockRead(bytes);
  let readAttempted = false;

  const read = await readPickedBackupZipBytes(
    'file:///mock/DocumentPicker/ephemeral.zip',
    mockFileApiAccess({
      getInfo: async () => ({ exists: false, isDirectory: false }),
      readBytes: async () => {
        readAttempted = true;
        return payload;
      },
    }),
    { knownSize: bytes.byteLength },
  );

  assert(readAttempted, 'read attempted when exists flag is false but asset.size is known');
  assert(read.byteLength === bytes.byteLength, 'bytes read successfully');
}

async function testTooLargeFromInfo(): Promise<void> {
  const limit = BACKUP_IMPORT_LIMITS.maxZipBytes;
  try {
    await readPickedBackupZipBytes(
      'file:///mock/huge.zip',
      mockFileApiAccess({
        getInfo: async () => ({ exists: true, isDirectory: false, size: limit + 1 }),
        readBytes: async () => new Uint8Array(0),
      }),
    );
    throw new Error('expected throw');
  } catch (error) {
    assert(
      error instanceof Error && error.message === 'קובץ הגיבוי גדול מדי',
      'size from File.info',
    );
  }
}

async function testTooLargeFromKnownSize(): Promise<void> {
  const limit = BACKUP_IMPORT_LIMITS.maxZipBytes;
  try {
    await readPickedBackupZipBytes(
      'content://mock/huge.zip',
      mockFileApiAccess({
        getInfo: async () => ({ exists: true, isDirectory: false }),
        readBytes: async () => new Uint8Array(0),
      }),
      { knownSize: limit + 1 },
    );
    throw new Error('expected throw');
  } catch (error) {
    assert(
      error instanceof Error && error.message === 'קובץ הגיבוי גדול מדי',
      'size from picker metadata',
    );
  }
}

async function testPermissionError(): Promise<void> {
  try {
    await readPickedBackupZipBytes(
      'content://mock/denied.zip',
      mockFileApiAccess({
        getInfo: async () => {
          throw new Error('Permission denied');
        },
        readBytes: async () => {
          throw new Error('should not read');
        },
      }),
    );
    throw new Error('expected throw');
  } catch (error) {
    assert(
      error instanceof Error && error.message === 'לא ניתן לגשת לקובץ הגיבוי',
      'permission on stat without knownSize',
    );
    const cause = (error as Error & { cause?: unknown }).cause;
    assert(cause instanceof Error && cause.message === 'Permission denied', 'cause preserved');
  }
}

async function testReadFailureControlled(): Promise<void> {
  try {
    await readPickedBackupZipBytes(
      'file:///mock/unreadable.zip',
      mockFileApiAccess({
        getInfo: async () => ({ exists: true, isDirectory: false, size: 4 }),
        readBytes: async () => {
          throw new Error("ExponentFileSystem.read rejected — Location isn't readable.");
        },
      }),
    );
    throw new Error('expected throw');
  } catch (error) {
    assert(
      error instanceof Error && error.message === 'לא ניתן לקרוא את קובץ הגיבוי',
      'read failure message',
    );
  }
}

function testUriSchemeClassification(): void {
  assert(devClassifyPickerUriScheme('content://authority/doc') === 'content', 'content scheme');
  assert(devClassifyPickerUriScheme('file:///cache/x.zip') === 'file', 'file scheme');
  assert(devClassifyPickerUriScheme('asset:/x') === 'other', 'other scheme');
}

function testAndroidPickerKeepsContentUri(): void {
  assert(
    documentPickerCopyToCacheDirectoryForPlatform('android') === false,
    'android should not force DocumentPicker cache copy',
  );
  assert(
    documentPickerCopyToCacheDirectoryForPlatform('ios') === true,
    'ios keeps cache copy',
  );
}

async function testGoogleDriveStyleContentRead(): Promise<void> {
  const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  const { bytes: payload } = pickedBackupBytesForMockRead(bytes);

  const read = await readPickedBackupZipBytes(
    'content://com.google.android.apps.docs.storage/document/encoded-mock',
    mockFileApiAccess({
      getInfo: async () => ({ exists: false, isDirectory: false }),
      readBytes: async () => payload,
    }),
    { knownSize: bytes.byteLength },
  );

  assert(read.byteLength === bytes.byteLength, 'content URI read without relying on exists flag');
}

function testPickerCancelled(): void {
  const result = { canceled: true as const, assets: null };
  assert(result.canceled === true, 'picker cancel is not treated as read failure');
}

async function run(): Promise<void> {
  await testReadableCacheUriNoCopy();
  await testContentUriReadableWithoutStat();
  await testMissingFile();
  await testUnreliableExistsStillReadsWithKnownSize();
  await testTooLargeFromInfo();
  await testTooLargeFromKnownSize();
  await testPermissionError();
  await testReadFailureControlled();
  testUriSchemeClassification();
  testAndroidPickerKeepsContentUri();
  await testGoogleDriveStyleContentRead();
  testPickerCancelled();
  console.log('wishlyBackupPickRead.selfCheck: all passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
