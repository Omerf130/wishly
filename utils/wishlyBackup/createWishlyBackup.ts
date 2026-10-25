import Constants from 'expo-constants';
import {
  deleteAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
  EncodingType,
} from 'expo-file-system/legacy';

import { getDatabase } from '@/database/client';
import { readWishlyBackupSnapshot } from '@/database/backupSnapshot';
import { nowIso } from '@/database/dates';
import { assembleWishlyBackupZip } from '@/utils/wishlyBackup/buildArchive';
import { collectUniqueLocalImageReferences } from '@/utils/wishlyBackup/collectImages';
import { uint8ArrayToBase64 } from '@/utils/wishlyBackup/bytes';
import {
  devLogBackupFailure,
  type WishlyBackupExportStage,
} from '@/utils/wishlyBackup/devBackupDiagnostic';
import { BackupExportError } from '@/utils/wishlyBackup/errors';
import { loadBackupImagePayloads } from '@/utils/wishlyBackup/loadLocalImages';
import { backupCacheDirectoryUri } from '@/utils/wishlyBackup/backupCache';
import type { BackupExportResult } from '@/utils/wishlyBackup/types';

function resolveAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function backupFileName(createdAt: string): string {
  const safe = createdAt.replace(/[:.]/g, '-');
  return `wishly-backup-${safe}.zip`;
}

async function runExportStage<T>(
  stage: WishlyBackupExportStage,
  task: () => Promise<T>,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    devLogBackupFailure({ flowStage: 'creating', exportStage: stage }, error);
    throw error;
  }
}

export async function createWishlyBackup(): Promise<BackupExportResult> {
  let exportStage: WishlyBackupExportStage = 'cache_dir';

  const outputDir = backupCacheDirectoryUri();
  if (!outputDir) {
    const error = new BackupExportError('אחסון זמני אינו זמין במכשיר');
    devLogBackupFailure({ flowStage: 'creating', exportStage: 'cache_dir' }, error);
    throw error;
  }

  const createdAt = nowIso();
  const outputUri = `${outputDir}${backupFileName(createdAt)}`;

  let wroteFile = false;

  try {
    exportStage = 'make_directory';
    await runExportStage('make_directory', () =>
      makeDirectoryAsync(outputDir, { intermediates: true }),
    );

    exportStage = 'open_database';
    const db = await runExportStage('open_database', () => getDatabase());

    exportStage = 'read_snapshot';
    const snapshot = await runExportStage('read_snapshot', () => readWishlyBackupSnapshot(db));

    exportStage = 'collect_image_refs';
    const imageReferences = await runExportStage('collect_image_refs', async () =>
      collectUniqueLocalImageReferences(snapshot.dreams),
    );

    exportStage = 'load_images';
    const images = await runExportStage('load_images', () =>
      loadBackupImagePayloads(imageReferences),
    );

    exportStage = 'assemble_zip';
    const assembled = await runExportStage('assemble_zip', () =>
      assembleWishlyBackupZip({
        snapshot,
        images,
        appVersion: resolveAppVersion(),
        createdAt,
      }),
    );

    exportStage = 'write_zip_file';
    await runExportStage('write_zip_file', () =>
      writeAsStringAsync(outputUri, uint8ArrayToBase64(assembled.zipBytes), {
        encoding: EncodingType.Base64,
      }),
    );
    wroteFile = true;

    return {
      fileUri: outputUri,
      byteSize: assembled.zipBytes.byteLength,
      dreamCount: assembled.dreamCount,
      transactionCount: assembled.transactionCount,
      imageCount: assembled.imageCount,
      createdAt: assembled.createdAt,
    };
  } catch (error) {
    if (wroteFile) {
      try {
        await deleteAsync(outputUri, { idempotent: true });
      } catch {
        // Best-effort cleanup.
      }
    }
    if (error instanceof BackupExportError) {
      throw error;
    }
    devLogBackupFailure({ flowStage: 'creating', exportStage }, error);
    throw new BackupExportError('יצירת הגיבוי נכשלה', { cause: error });
  }
}
