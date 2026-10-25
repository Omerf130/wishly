import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { BACKUP_IMPORT_LIMITS } from '@/utils/wishlyBackup/importLimits';

export type PickedBackupFileInfo = {
  exists: boolean;
  isDirectory?: boolean;
  size?: number;
};

export type PickedBackupFileAccess = {
  getInfo: (uri: string) => Promise<PickedBackupFileInfo>;
  readBytes: (uri: string) => Promise<Uint8Array>;
};

function assertZipSizeWithinLimit(size: number | undefined): void {
  if (typeof size === 'number' && size > BACKUP_IMPORT_LIMITS.maxZipBytes) {
    throw new BackupImportError('קובץ הגיבוי גדול מדי');
  }
}

function finalizeZipBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength > BACKUP_IMPORT_LIMITS.maxZipBytes) {
    throw new BackupImportError('קובץ הגיבוי גדול מדי');
  }
  if (bytes.byteLength === 0) {
    throw new BackupImportError('קובץ הגיבוי ריק');
  }
  return bytes;
}

/**
 * Reads ZIP bytes from a URI returned by Document Picker (after `copyToCacheDirectory: true`).
 * Does not copy to another path — reads in place when the URI is readable.
 */
export async function readPickedBackupZipBytes(
  sourceUri: string,
  access: PickedBackupFileAccess,
  options?: { knownSize?: number },
): Promise<Uint8Array> {
  assertZipSizeWithinLimit(options?.knownSize);

  let info: PickedBackupFileInfo | null = null;
  try {
    info = await access.getInfo(sourceUri);
  } catch (cause) {
    if (options?.knownSize === undefined) {
      throw new BackupImportError('לא ניתן לגשת לקובץ הגיבוי', { cause });
    }
  }

  if (info !== null) {
    if (info.isDirectory) {
      throw new BackupImportError('קובץ הגיבוי לא נמצא');
    }
    if (info.exists) {
      assertZipSizeWithinLimit(info.size);
    }
  }

  let bytes: Uint8Array;
  try {
    bytes = await access.readBytes(sourceUri);
  } catch (cause) {
    throw new BackupImportError('לא ניתן לקרוא את קובץ הגיבוי', { cause });
  }

  return finalizeZipBytes(bytes);
}

/** Test helper: mock stat + bytes for a picked file. */
export function pickedBackupBytesForMockRead(bytes: Uint8Array): {
  info: PickedBackupFileInfo;
  bytes: Uint8Array;
} {
  return {
    info: { exists: true, isDirectory: false, size: bytes.byteLength },
    bytes: new Uint8Array(bytes),
  };
}
