import { BackupImportError } from '@/utils/wishlyBackup/importErrors';

const SAFE_FILENAME = /^[\w.-]+$/;
const IMAGE_ARCHIVE_PREFIX = 'images/dream-images/';

export function normalizeZipEntryName(raw: string): string {
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalized || normalized.includes('\0')) {
    throw new BackupImportError('קובץ הגיבוי מכיל נתיב לא תקין');
  }
  if (normalized.includes('..') || normalized.includes(':')) {
    throw new BackupImportError('קובץ הגיבוי מכיל נתיב לא מורשה');
  }
  return normalized;
}

export function assertAllowedWishlyBackupZipEntry(name: string): void {
  if (name === 'manifest.json' || name === 'data.json') {
    return;
  }

  if (!name.startsWith(IMAGE_ARCHIVE_PREFIX)) {
    throw new BackupImportError('קובץ הגיבוי מכיל קבצים לא צפויים');
  }

  const rest = name.slice(IMAGE_ARCHIVE_PREFIX.length);
  if (!rest || rest.includes('/')) {
    throw new BackupImportError('קובץ הגיבוי מכיל נתיב תמונה לא תקין');
  }

  if (!SAFE_FILENAME.test(rest)) {
    throw new BackupImportError('קובץ הגיבוי מכיל שם קובץ לא תקין');
  }
}

export function imageReferenceFromArchivePath(archivePath: string): string {
  const normalized = normalizeZipEntryName(archivePath);
  if (!normalized.startsWith('images/')) {
    throw new BackupImportError('מטא-דאטה של תמונה לא תקין');
  }
  return normalized.slice('images/'.length);
}
