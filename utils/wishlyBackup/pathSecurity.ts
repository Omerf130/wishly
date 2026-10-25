import { BackupExportError } from '@/utils/wishlyBackup/errors';

/** Must match `DREAM_IMAGES_DIR` in `utils/dreamLocalImages.ts`. */
const DREAM_IMAGES_DIR = 'dream-images';

const SAFE_FILENAME = /^[\w.-]+$/;

/**
 * Validates a relative local dream image path stored in SQLite.
 * Rejects traversal and paths outside dream-images/.
 */
export function assertSafeLocalDreamImageReference(relativePath: string): string {
  const trimmed = relativePath.trim();
  if (!trimmed) {
    throw new BackupExportError('נתיב תמונה אישית לא תקין');
  }

  const normalized = trimmed.replace(/^\/+/, '');
  if (normalized.includes('..') || normalized.includes('\\') || normalized.includes('\0')) {
    throw new BackupExportError('נתיב תמונה אישית לא תקין');
  }

  const segments = normalized.split('/');
  if (segments.length !== 2) {
    throw new BackupExportError('נתיב תמונה אישית לא תקין');
  }

  const [dir, filename] = segments;
  if (dir !== DREAM_IMAGES_DIR || !filename || !SAFE_FILENAME.test(filename)) {
    throw new BackupExportError('נתיב תמונה אישית לא תקין');
  }

  return normalized;
}

export function archivePathForImageReference(imageReference: string): string {
  return `images/${imageReference}`;
}
