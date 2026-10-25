import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';

import { backupCacheDirectoryUri } from '@/utils/wishlyBackup/backupCache';
import {
  documentPickerCopyToCacheDirectoryForPlatform,
  type DocumentPickerHostPlatform,
} from '@/utils/wishlyBackup/documentPickerBackupImportOptions';
import { devLogBackupImportFailure } from '@/utils/wishlyBackup/devBackupImportDiagnostic';
import { devSetImportValidationStage } from '@/utils/wishlyBackup/devImportValidationStage';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { readBackupZipBytesFromUri } from '@/utils/wishlyBackup/readBackupZipBytes';
import {
  validateWishlyBackupZipBytes,
  type BackupValidationSuccess,
} from '@/utils/wishlyBackup/validateBackupArchive';

export function isDocumentPickerCancelled(result: DocumentPicker.DocumentPickerResult): boolean {
  return result.canceled;
}

function documentPickerCopyToCacheDirectoryForBackupImport(): boolean {
  const os = Platform.OS;
  if (os === 'android' || os === 'ios' || os === 'web') {
    return documentPickerCopyToCacheDirectoryForPlatform(os);
  }
  return documentPickerCopyToCacheDirectoryForPlatform('unknown' as DocumentPickerHostPlatform);
}

export async function pickAndValidateWishlyBackupFile(): Promise<
  BackupValidationSuccess | { ok: false; userMessage: string; cancelled?: boolean }
> {
  devSetImportValidationStage('picking_file');

  if (!backupCacheDirectoryUri()) {
    const error = new BackupImportError('אחסון זמני אינו זמין במכשיר');
    devLogBackupImportFailure(
      { flowStage: 'validating', validationStage: 'picking_file' },
      error,
    );
    throw error;
  }

  const documentPickerCopyToCacheDirectory = documentPickerCopyToCacheDirectoryForBackupImport();

  const pickResult = await DocumentPicker.getDocumentAsync({
    type: 'application/zip',
    copyToCacheDirectory: documentPickerCopyToCacheDirectory,
    multiple: false,
  });

  if (pickResult.canceled) {
    return { ok: false, userMessage: 'בחירת הקובץ בוטלה', cancelled: true };
  }

  const asset = pickResult.assets?.[0];
  if (!asset?.uri) {
    return { ok: false, userMessage: 'לא נבחר קובץ גיבוי' };
  }

  devSetImportValidationStage('reading_file');
  const zipBytes = await readBackupZipBytesFromUri(asset.uri, {
    knownSize: typeof asset.size === 'number' ? asset.size : undefined,
    documentPickerCopyToCacheDirectory,
  });

  devSetImportValidationStage('scanning_zip');
  return validateWishlyBackupZipBytes(zipBytes);
}
