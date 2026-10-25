import { unzipSync, type Unzipped } from 'fflate';

import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { BACKUP_IMPORT_LIMITS } from '@/utils/wishlyBackup/importLimits';
import {
  assertAllowedWishlyBackupZipEntry,
  normalizeZipEntryName,
} from '@/utils/wishlyBackup/zipEntryPaths';

export type ScannedZipEntry = {
  name: string;
  originalSize: number;
  compressedSize: number;
};

export function scanWishlyBackupZip(zipBytes: Uint8Array): ScannedZipEntry[] {
  if (zipBytes.byteLength <= 0) {
    throw new BackupImportError('קובץ הגיבוי ריק');
  }
  if (zipBytes.byteLength > BACKUP_IMPORT_LIMITS.maxZipBytes) {
    throw new BackupImportError('קובץ הגיבוי גדול מדי');
  }

  const entries: ScannedZipEntry[] = [];
  const seen = new Set<string>();
  let entryCount = 0;
  let totalUncompressed = 0;

  try {
    unzipSync(zipBytes, {
      filter: (file) => {
        entryCount += 1;
        if (entryCount > BACKUP_IMPORT_LIMITS.maxZipEntries) {
          throw new BackupImportError('קובץ הגיבוי מכיל יותר מדי קבצים');
        }

        const name = normalizeZipEntryName(file.name);
        assertAllowedWishlyBackupZipEntry(name);

        if (seen.has(name)) {
          throw new BackupImportError('קובץ הגיבוי מכיל שמות קבצים כפולים');
        }
        seen.add(name);

        const originalSize = file.originalSize ?? 0;
        if (originalSize < 0 || !Number.isFinite(originalSize)) {
          throw new BackupImportError('קובץ הגיבוי פגום');
        }

        if (name === 'manifest.json' && originalSize > BACKUP_IMPORT_LIMITS.maxManifestBytes) {
          throw new BackupImportError('קובץ manifest.json גדול מדי');
        }
        if (name === 'data.json' && originalSize > BACKUP_IMPORT_LIMITS.maxDataJsonBytes) {
          throw new BackupImportError('קובץ data.json גדול מדי');
        }
        if (name.startsWith('images/') && originalSize > BACKUP_IMPORT_LIMITS.maxImageBytes) {
          throw new BackupImportError('אחת התמונות בגיבוי גדולה מדי');
        }

        totalUncompressed += originalSize;
        if (totalUncompressed > BACKUP_IMPORT_LIMITS.maxUncompressedTotalBytes) {
          throw new BackupImportError('קובץ הגיבוי חורג ממגבלת גודל בטוחה');
        }

        entries.push({
          name,
          originalSize,
          compressedSize: file.size ?? 0,
        });

        return false;
      },
    });
  } catch (error) {
    if (error instanceof BackupImportError) {
      throw error;
    }
    throw new BackupImportError('קובץ ZIP פגום או לא נתמך', { cause: error });
  }

  return entries;
}

export function extractWishlyBackupEntries(
  zipBytes: Uint8Array,
  entryNames: Set<string>,
): Unzipped {
  const allowed = new Set(entryNames);

  try {
    const files = unzipSync(zipBytes, {
      filter: (file) => {
        const name = normalizeZipEntryName(file.name);
        return allowed.has(name);
      },
    });

    for (const name of allowed) {
      if (!(name in files)) {
        throw new BackupImportError('קובץ הגיבוי חסר קבצים נדרשים');
      }
    }

    return files;
  } catch (error) {
    if (error instanceof BackupImportError) {
      throw error;
    }
    throw new BackupImportError('לא ניתן לקרוא את קובץ הגיבוי', { cause: error });
  }
}
