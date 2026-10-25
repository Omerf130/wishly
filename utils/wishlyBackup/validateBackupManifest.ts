import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import {
  BACKUP_IMPORT_LIMITS,
  SUPPORTED_BACKUP_VERSION,
  SUPPORTED_MAX_SCHEMA_VERSION,
} from '@/utils/wishlyBackup/importLimits';
import { archivePathForImageReference } from '@/utils/wishlyBackup/pathSecurity';
import { imageReferenceFromArchivePath } from '@/utils/wishlyBackup/zipEntryPaths';
import {
  WISHLY_APPLICATION_ID,
  WISHLY_BACKUP_FORMAT,
  type WishlyBackupManifest,
} from '@/utils/wishlyBackup/types';

const SHA256_HEX = /^[0-9a-f]{64}$/;

function assertObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BackupImportError(`${label} אינו בפורמט תקין`);
  }
  return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return value;
}

function assertIsoTimestamp(value: unknown, label: string): string {
  const text = assertString(value, label);
  if (Number.isNaN(Date.parse(text))) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return text;
}

function assertNonNegativeInt(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new BackupImportError(`${label} אינו תקין`);
  }
  return value;
}

function assertChecksum(value: unknown, label: string): { sha256: string; byteSize: number } {
  const obj = assertObject(value, label);
  const sha256 = assertString(obj.sha256, `${label} checksum`);
  if (!SHA256_HEX.test(sha256)) {
    throw new BackupImportError(`${label} checksum אינו תקין`);
  }
  const byteSize = assertNonNegativeInt(obj.byteSize, `${label} byteSize`);
  return { sha256, byteSize };
}

export function parseBackupManifestBytes(manifestBytes: Uint8Array): WishlyBackupManifest {
  if (manifestBytes.byteLength > BACKUP_IMPORT_LIMITS.maxManifestBytes) {
    throw new BackupImportError('קובץ manifest.json גדול מדי');
  }

  let parsed: unknown;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes);
    parsed = JSON.parse(text);
  } catch {
    throw new BackupImportError('קובץ manifest.json אינו JSON תקין');
  }

  const obj = assertObject(parsed, 'manifest.json');

  if (obj.format !== WISHLY_BACKUP_FORMAT) {
    throw new BackupImportError('פורמט הגיבוי אינו נתמך');
  }

  const backupVersion = assertNonNegativeInt(obj.backupVersion, 'backupVersion');
  if (backupVersion !== SUPPORTED_BACKUP_VERSION) {
    throw new BackupImportError('גרסת הגיבוי אינה נתמכת');
  }

  if (obj.applicationId !== WISHLY_APPLICATION_ID) {
    throw new BackupImportError('קובץ הגיבוי אינו של Wishly');
  }

  const schemaVersion = assertNonNegativeInt(obj.schemaVersion, 'schemaVersion');
  if (schemaVersion < 1 || schemaVersion > SUPPORTED_MAX_SCHEMA_VERSION) {
    throw new BackupImportError('גרסת הסכמה בגיבוי אינה נתמכת');
  }

  if (obj.encrypted !== false) {
    throw new BackupImportError('גיבויים מוצפנים אינם נתמכים בשלב זה');
  }

  const dreamCount = assertNonNegativeInt(obj.dreamCount, 'dreamCount');
  const transactionCount = assertNonNegativeInt(obj.transactionCount, 'transactionCount');
  const imageCount = assertNonNegativeInt(obj.imageCount, 'imageCount');

  if (dreamCount > BACKUP_IMPORT_LIMITS.maxDreams) {
    throw new BackupImportError('מספר החלומות בגיבוי חורג מהמגבלה');
  }
  if (transactionCount > BACKUP_IMPORT_LIMITS.maxTransactions) {
    throw new BackupImportError('מספר הפעולות בגיבוי חורג מהמגבלה');
  }
  if (imageCount > BACKUP_IMPORT_LIMITS.maxImageFiles) {
    throw new BackupImportError('מספר התמונות בגיבוי חורג מהמגבלה');
  }

  if (!Array.isArray(obj.images)) {
    throw new BackupImportError('מטא-דאטה של תמונות אינו תקין');
  }
  if (obj.images.length !== imageCount) {
    throw new BackupImportError('מספר התמונות ב-manifest אינו תואם');
  }

  const images = obj.images.map((entry, index) => {
    const imageObj = assertObject(entry, `תמונה ${index + 1} ב-manifest`);
    const archivePath = assertString(imageObj.archivePath, `archivePath (${index + 1})`);
    const imageReference = assertString(imageObj.imageReference, `imageReference (${index + 1})`);
    const expectedArchive = archivePathForImageReference(imageReference);
    if (archivePath !== expectedArchive) {
      throw new BackupImportError('נתיב תמונה ב-manifest אינו תואם');
    }
    if (imageReferenceFromArchivePath(archivePath) !== imageReference) {
      throw new BackupImportError('מטא-דאטה של תמונה אינו תקין');
    }
    const checksum = assertChecksum(imageObj, `תמונה ${index + 1}`);
    const contentType = assertString(imageObj.contentType, `contentType (${index + 1})`);
    return {
      archivePath,
      imageReference,
      sha256: checksum.sha256,
      byteSize: checksum.byteSize,
      contentType,
    };
  });

  const imagePaths = new Set(images.map((image) => image.archivePath));
  if (imagePaths.size !== images.length) {
    throw new BackupImportError('קובץ הגיבוי מכיל תמונות כפולות ב-manifest');
  }

  return {
    format: WISHLY_BACKUP_FORMAT,
    backupVersion,
    createdAt: assertIsoTimestamp(obj.createdAt, 'createdAt'),
    applicationId: WISHLY_APPLICATION_ID,
    appVersion: assertString(obj.appVersion, 'appVersion'),
    schemaVersion,
    encrypted: false,
    encryptionNotice: assertString(obj.encryptionNotice, 'encryptionNotice'),
    dreamCount,
    transactionCount,
    imageCount,
    dataJson: assertChecksum(obj.dataJson, 'data.json'),
    images,
  };
}
