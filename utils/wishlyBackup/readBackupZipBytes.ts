import { File } from 'expo-file-system';

import {
  createBackupImportFileReadDevContext,
  type BackupImportFileReadDevContext,
} from '@/utils/wishlyBackup/devBackupImportFileReadContext';
import {
  isPickerUriInAppCache,
  wishlyBackupValidateImportDirectory,
} from '@/utils/wishlyBackup/pickerUriSandbox';
import { devLogBackupImportFailure } from '@/utils/wishlyBackup/devBackupImportDiagnostic';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import {
  readPickedBackupZipBytes,
  type PickedBackupFileAccess,
} from '@/utils/wishlyBackup/readPickedBackupZipBytes';

function logReadFailure(
  validationStage: 'reading_file',
  error: unknown,
  fileRead?: BackupImportFileReadDevContext,
): void {
  devLogBackupImportFailure(
    { flowStage: 'validating', validationStage, fileRead },
    error,
  );
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function shouldImportContentUriAfterReadFailure(
  readDev: BackupImportFileReadDevContext,
  error: unknown,
): boolean {
  if (readDev.uriScheme !== 'content' || readDev.fileApiImportAttempted) {
    return false;
  }
  const code = errorCode(error);
  if (code === 'ERR_INVALID_PERMISSION') {
    return true;
  }
  if (error instanceof BackupImportError) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return errorCode(cause) === 'ERR_INVALID_PERMISSION';
  }
  return false;
}

function recordFileSizeProbe(readDev: BackupImportFileReadDevContext, file: File): void {
  readDev.fileExistsValue = file.exists;
  const size = file.size;
  if (typeof size === 'number' && size > 0) {
    readDev.fileSizeValue = size;
    readDev.fileSizeValueAvailable = true;
  }
}

function createExpoFileAccess(
  readDev: BackupImportFileReadDevContext,
): PickedBackupFileAccess {
  return {
    async getInfo(uri) {
      readDev.fileApiStatAttempted = true;
      let file: File;
      try {
        file = new File(uri);
      } catch (cause) {
        readDev.fileApiFailurePhase = 'construct';
        throw cause;
      }

      recordFileSizeProbe(readDev, file);

      try {
        const info = file.info();
        readDev.fileApiStatSucceeded = true;
        if (typeof info.size === 'number' && info.size > 0) {
          readDev.fileSizeValue = info.size;
          readDev.fileSizeValueAvailable = true;
        }
        return {
          exists: info.exists,
          isDirectory: false,
          size: typeof info.size === 'number' ? info.size : undefined,
        };
      } catch (cause) {
        readDev.fileApiStatSucceeded = true;
        return {
          exists: file.exists,
          isDirectory: false,
          size:
            readDev.fileSizeValueAvailable && typeof readDev.fileSizeValue === 'number'
              ? readDev.fileSizeValue
              : undefined,
        };
      }
    },
    async readBytes(uri) {
      readDev.fileApiReadAttempted = true;
      let file: File;
      try {
        file = new File(uri);
      } catch (cause) {
        readDev.fileApiFailurePhase = 'construct';
        throw cause;
      }

      try {
        const bytes = await file.bytes();
        readDev.fileApiReadSucceeded = true;
        return bytes;
      } catch (cause) {
        readDev.fileApiFailurePhase = 'read';
        throw cause;
      }
    },
  };
}

async function importPickedBackupToAppCache(
  sourceUri: string,
  readDev: BackupImportFileReadDevContext,
): Promise<string> {
  readDev.fileApiImportAttempted = true;
  readDev.fileApiFailurePhase = 'import_copy';

  const source = new File(sourceUri);
  const dir = wishlyBackupValidateImportDirectory();
  dir.create({ intermediates: true });
  const dest = new File(dir, `import-${Date.now()}.zip`);

  try {
    await source.copy(dest, { overwrite: true });
  } catch (cause) {
    throw new BackupImportError('לא ניתן לקרוא את קובץ הגיבוי', { cause });
  }

  readDev.fileApiImportSucceeded = true;
  readDev.uriInAppCache = true;
  return dest.uri;
}

async function readFromResolvedUri(
  sourceUri: string,
  readDev: BackupImportFileReadDevContext,
  options?: { knownSize?: number },
): Promise<Uint8Array> {
  return readPickedBackupZipBytes(sourceUri, createExpoFileAccess(readDev), options);
}

export async function readBackupZipBytesFromUri(
  sourceUri: string,
  options?: { knownSize?: number; documentPickerCopyToCacheDirectory?: boolean },
): Promise<Uint8Array> {
  const readDev = createBackupImportFileReadDevContext(sourceUri, {
    ...options,
    uriInAppCache: isPickerUriInAppCache(sourceUri),
  });

  try {
    return await readFromResolvedUri(sourceUri, readDev, options);
  } catch (error) {
    const importCandidate =
      error instanceof BackupImportError ? error : null;
    const rootCause = importCandidate
      ? (importCandidate as Error & { cause?: unknown }).cause
      : error;

    if (
      importCandidate &&
      shouldImportContentUriAfterReadFailure(readDev, importCandidate)
    ) {
      try {
        const localUri = await importPickedBackupToAppCache(sourceUri, readDev);
        readDev.fileApiReadAttempted = false;
        readDev.fileApiReadSucceeded = false;
        return await readFromResolvedUri(localUri, readDev, options);
      } catch (importError) {
        if (!(importError instanceof BackupImportError)) {
          const wrapped = new BackupImportError('לא ניתן לקרוא את קובץ הגיבוי', {
            cause: importError,
          });
          logReadFailure('reading_file', wrapped, readDev);
          throw wrapped;
        }
        logReadFailure('reading_file', importError, readDev);
        throw importError;
      }
    }

    if (!(error instanceof BackupImportError)) {
      const wrapped = new BackupImportError('לא ניתן לקרוא את קובץ הגיבוי', { cause: error });
      logReadFailure('reading_file', wrapped, readDev);
      throw wrapped;
    }

    if (errorCode(rootCause) === 'ERR_INVALID_PERMISSION' && readDev.uriScheme === 'file') {
      logReadFailure('reading_file', error, readDev);
      throw error;
    }

    logReadFailure('reading_file', error, readDev);
    throw error;
  }
}
