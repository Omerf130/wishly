import { BackupImportError } from '@/utils/wishlyBackup/importErrors';

function startsWith(bytes: Uint8Array, pattern: number[]): boolean {
  if (bytes.byteLength < pattern.length) {
    return false;
  }
  for (let i = 0; i < pattern.length; i += 1) {
    if (bytes[i] !== pattern[i]) {
      return false;
    }
  }
  return true;
}

/** Best-effort magic-byte check for dream image files in backups. */
export function assertRecognizedDreamImageBytes(bytes: Uint8Array): void {
  if (bytes.byteLength < 4) {
    throw new BackupImportError('קובץ תמונה בגיבוי אינו תקין');
  }

  const isJpeg = startsWith(bytes, [0xff, 0xd8, 0xff]);
  const isPng = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  const isWebp =
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.byteLength >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  const isHeic =
    bytes.byteLength >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;

  if (!isJpeg && !isPng && !isWebp && !isHeic) {
    throw new BackupImportError('קובץ תמונה בגיבוי אינו בפורמט נתמך');
  }
}
