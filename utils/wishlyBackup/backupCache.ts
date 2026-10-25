import {
  cacheDirectory,
  deleteAsync,
  getInfoAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';

import { localYmdFromDate } from '@/utils/localCalendarDate';

export const BACKUP_CACHE_DIR_SEGMENT = 'wishly-backups/';

/** Max ZIP files kept in app cache (excluding URIs listed in excludeUris). */
export const MAX_CACHED_BACKUP_FILES = 5;

export function backupCacheDirectoryUri(): string | null {
  if (!cacheDirectory) {
    return null;
  }
  return `${cacheDirectory}${BACKUP_CACHE_DIR_SEGMENT}`;
}

export function shareDisplayBackupFileName(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return 'wishly-backup.zip';
  }
  const ymd = localYmdFromDate(date);
  return `wishly-backup-${ymd}.zip`;
}

export async function pruneOldBackupCacheFiles(excludeUris: string[] = []): Promise<void> {
  const dir = backupCacheDirectoryUri();
  if (!dir) {
    return;
  }

  const exclude = new Set(excludeUris.filter(Boolean));

  let names: string[] = [];
  try {
    names = await readDirectoryAsync(dir);
  } catch {
    return;
  }

  const zipEntries: { uri: string; modificationTime: number }[] = [];

  for (const name of names) {
    if (!name.endsWith('.zip')) {
      continue;
    }
    const uri = `${dir}${name}`;
    if (exclude.has(uri)) {
      continue;
    }
    try {
      const info = await getInfoAsync(uri);
      if (info.exists && !info.isDirectory && typeof info.modificationTime === 'number') {
        zipEntries.push({ uri, modificationTime: info.modificationTime });
      }
    } catch {
      // Skip unreadable entries.
    }
  }

  if (zipEntries.length <= MAX_CACHED_BACKUP_FILES) {
    return;
  }

  zipEntries.sort((a, b) => a.modificationTime - b.modificationTime);
  const toRemove = zipEntries.slice(0, zipEntries.length - MAX_CACHED_BACKUP_FILES);

  for (const entry of toRemove) {
    if (exclude.has(entry.uri)) {
      continue;
    }
    try {
      await deleteAsync(entry.uri, { idempotent: true });
    } catch {
      // Best-effort cleanup.
    }
  }
}
