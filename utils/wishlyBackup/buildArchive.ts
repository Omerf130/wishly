import { zipSync } from 'fflate';

import type { WishlyBackupSnapshot } from '@/database/backupSnapshotTypes';
import { BACKUP_LIMITS } from '@/utils/wishlyBackup/limits';
import { BackupExportError } from '@/utils/wishlyBackup/errors';
import { collectUniqueLocalImageReferences } from '@/utils/wishlyBackup/collectImages';
import { archivePathForImageReference } from '@/utils/wishlyBackup/pathSecurity';
import { contentTypeForDreamImageFilename } from '@/utils/wishlyBackup/contentType';
import { sha256Hex, sha256HexFromUtf8 } from '@/utils/wishlyBackup/sha256';
import {
  WISHLY_APPLICATION_ID,
  WISHLY_BACKUP_FORMAT,
  WISHLY_BACKUP_VERSION,
  type BackupImagePayload,
  type WishlyBackupDataJson,
  type WishlyBackupManifest,
} from '@/utils/wishlyBackup/types';

export type AssembledWishlyBackup = {
  zipBytes: Uint8Array;
  manifest: WishlyBackupManifest;
  dreamCount: number;
  transactionCount: number;
  imageCount: number;
  createdAt: string;
};

function assertCountsWithinLimits(dreamCount: number, transactionCount: number, imageCount: number): void {
  if (dreamCount > BACKUP_LIMITS.maxDreams) {
    throw new BackupExportError('מספר החלומות חורג מהמגבלה המותרת לגיבוי');
  }
  if (transactionCount > BACKUP_LIMITS.maxTransactions) {
    throw new BackupExportError('מספר הפעולות חורג מהמגבלה המותרת לגיבוי');
  }
  if (imageCount > BACKUP_LIMITS.maxImageFiles) {
    throw new BackupExportError('מספר התמונות חורג מהמגבלה המותרת לגיבוי');
  }
}

function buildDataJson(snapshot: WishlyBackupSnapshot): WishlyBackupDataJson {
  return {
    dreams: snapshot.dreams,
    savingsTransactions: snapshot.savingsTransactions,
  };
}

function indexImagesByReference(images: BackupImagePayload[]): Map<string, Uint8Array> {
  const map = new Map<string, Uint8Array>();
  for (const entry of images) {
    if (map.has(entry.imageReference)) {
      continue;
    }
    map.set(entry.imageReference, entry.bytes);
  }
  return map;
}

export async function assembleWishlyBackupZip(input: {
  snapshot: WishlyBackupSnapshot;
  images: BackupImagePayload[];
  appVersion: string;
  createdAt: string;
}): Promise<AssembledWishlyBackup> {
  const { snapshot, appVersion, createdAt } = input;
  const dreamCount = snapshot.dreams.length;
  const transactionCount = snapshot.savingsTransactions.length;
  const requiredReferences = collectUniqueLocalImageReferences(snapshot.dreams);
  const imageCount = requiredReferences.length;

  assertCountsWithinLimits(dreamCount, transactionCount, imageCount);

  const imageMap = indexImagesByReference(input.images);

  for (const reference of requiredReferences) {
    if (!imageMap.has(reference)) {
      throw new BackupExportError('קובץ תמונה אישית חסר עבור אחד החלומות');
    }
  }

  let totalPayloadBytes = 0;
  const imageManifestEntries: WishlyBackupManifest['images'] = [];

  for (const reference of requiredReferences) {
    const bytes = imageMap.get(reference)!;
    if (bytes.byteLength > BACKUP_LIMITS.maxImageBytes) {
      throw new BackupExportError('אחת התמונות גדולה מדי לגיבוי');
    }
    totalPayloadBytes += bytes.byteLength;
    const sha256 = await sha256Hex(bytes);
    const filename = reference.split('/')[1] ?? reference;
    imageManifestEntries.push({
      archivePath: archivePathForImageReference(reference),
      imageReference: reference,
      sha256,
      byteSize: bytes.byteLength,
      contentType: contentTypeForDreamImageFilename(filename),
    });
  }

  const dataJsonObject = buildDataJson(snapshot);
  const dataJsonText = JSON.stringify(dataJsonObject);
  const dataJsonSha256 = await sha256HexFromUtf8(dataJsonText);
  const dataJsonByteSize = new TextEncoder().encode(dataJsonText).byteLength;

  const manifest: WishlyBackupManifest = {
    format: WISHLY_BACKUP_FORMAT,
    backupVersion: WISHLY_BACKUP_VERSION,
    createdAt,
    applicationId: WISHLY_APPLICATION_ID,
    appVersion,
    schemaVersion: snapshot.schemaVersion,
    encrypted: false,
    encryptionNotice: 'הגיבוי אינו מוצפן. שמור את הקובץ במקום מאובטח.',
    dreamCount,
    transactionCount,
    imageCount,
    dataJson: {
      sha256: dataJsonSha256,
      byteSize: dataJsonByteSize,
    },
    images: imageManifestEntries,
  };

  const manifestText = JSON.stringify(manifest, null, 2);
  const zipEntries: Record<string, Uint8Array> = {
    'data.json': new TextEncoder().encode(dataJsonText),
    'manifest.json': new TextEncoder().encode(manifestText),
  };

  for (const entry of imageManifestEntries) {
    const bytes = imageMap.get(entry.imageReference)!;
    zipEntries[entry.archivePath] = bytes;
  }

  const zipBytes = zipSync(zipEntries, { level: 6 });

  const estimated = zipBytes.byteLength;
  if (estimated > BACKUP_LIMITS.maxZipBytes) {
    throw new BackupExportError('גודל קובץ הגיבוי חורג מהמגבלה המותרת');
  }

  if (totalPayloadBytes + dataJsonByteSize > BACKUP_LIMITS.maxZipBytes) {
    throw new BackupExportError('גודל נתוני הגיבוי חורג מהמגבלה המותרת');
  }

  return {
    zipBytes,
    manifest,
    dreamCount,
    transactionCount,
    imageCount,
    createdAt,
  };
}
