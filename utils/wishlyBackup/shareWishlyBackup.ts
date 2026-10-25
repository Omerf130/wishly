import * as Sharing from 'expo-sharing';
import { copyAsync, getInfoAsync, makeDirectoryAsync } from 'expo-file-system/legacy';

import {
  backupCacheDirectoryUri,
  shareDisplayBackupFileName,
} from '@/utils/wishlyBackup/backupCache';
import { BackupExportError } from '@/utils/wishlyBackup/errors';

export type ShareWishlyBackupResult = {
  sharedUri: string;
};

export function isShareUserCancelled(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('cancel') ||
    message.includes('canceled') ||
    message.includes('cancelled') ||
    message.includes('dismiss')
  );
}

async function assertBackupFileReady(fileUri: string, expectedByteSize: number): Promise<number> {
  let info;
  try {
    info = await getInfoAsync(fileUri);
  } catch {
    throw new BackupExportError('לא ניתן לגשת לקובץ הגיבוי');
  }

  if (!info.exists || info.isDirectory) {
    throw new BackupExportError('קובץ הגיבוי לא נמצא');
  }

  const size = typeof info.size === 'number' ? info.size : expectedByteSize;
  if (size <= 0 || expectedByteSize <= 0) {
    throw new BackupExportError('קובץ הגיבוי ריק או פגום');
  }

  return size;
}

/**
 * Copies to a date-based display name when needed, then opens the system share sheet.
 */
export async function shareWishlyBackupFile(input: {
  fileUri: string;
  createdAt: string;
  byteSize: number;
}): Promise<ShareWishlyBackupResult> {
  await assertBackupFileReady(input.fileUri, input.byteSize);

  const cacheDir = backupCacheDirectoryUri();
  if (!cacheDir) {
    throw new BackupExportError('אחסון זמני אינו זמין במכשיר');
  }

  await makeDirectoryAsync(cacheDir, { intermediates: true });

  const displayName = shareDisplayBackupFileName(input.createdAt);
  const shareUri = `${cacheDir}${displayName}`;

  if (input.fileUri !== shareUri) {
    await copyAsync({ from: input.fileUri, to: shareUri });
    await assertBackupFileReady(shareUri, input.byteSize);
  }

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new BackupExportError('שיתוף קבצים אינו זמין במכשיר זה');
  }

  try {
    await Sharing.shareAsync(shareUri, {
      mimeType: 'application/zip',
      dialogTitle: 'שמירת גיבוי Wishly',
    });
  } catch (error) {
    if (isShareUserCancelled(error)) {
      throw new BackupExportError('שיתוף הגיבוי בוטל');
    }
    throw new BackupExportError('לא ניתן לפתוח את חלונית השיתוף', { cause: error });
  }

  return { sharedUri: shareUri };
}
