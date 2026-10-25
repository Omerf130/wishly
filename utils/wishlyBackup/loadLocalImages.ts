import {
  EncodingType,
  getInfoAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';

import { resolveRelativeDreamImageUri } from '@/utils/dreamLocalImages';
import { base64ToUint8Array } from '@/utils/wishlyBackup/bytes';
import { BackupExportError } from '@/utils/wishlyBackup/errors';
import { BACKUP_LIMITS } from '@/utils/wishlyBackup/limits';
import { assertSafeLocalDreamImageReference } from '@/utils/wishlyBackup/pathSecurity';
import type { BackupImagePayload } from '@/utils/wishlyBackup/types';

export async function readLocalDreamImageBytes(relativePath: string): Promise<Uint8Array> {
  const safePath = assertSafeLocalDreamImageReference(relativePath);
  const uri = resolveRelativeDreamImageUri(safePath);

  let info;
  try {
    info = await getInfoAsync(uri);
  } catch {
    throw new BackupExportError('לא ניתן לקרוא תמונה אישית לגיבוי');
  }

  if (!info.exists || info.isDirectory) {
    throw new BackupExportError('קובץ תמונה אישית חסר עבור אחד החלומות');
  }

  if (typeof info.size === 'number' && info.size > BACKUP_LIMITS.maxImageBytes) {
    throw new BackupExportError('אחת התמונות גדולה מדי לגיבוי');
  }

  let base64: string;
  try {
    base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  } catch {
    throw new BackupExportError('לא ניתן לקרוא תמונה אישית לגיבוי');
  }

  const bytes = base64ToUint8Array(base64);
  if (bytes.byteLength > BACKUP_LIMITS.maxImageBytes) {
    throw new BackupExportError('אחת התמונות גדולה מדי לגיבוי');
  }

  return bytes;
}

export async function loadBackupImagePayloads(references: string[]): Promise<BackupImagePayload[]> {
  const payloads: BackupImagePayload[] = [];
  for (const imageReference of references) {
    const bytes = await readLocalDreamImageBytes(imageReference);
    payloads.push({ imageReference, bytes });
  }
  return payloads;
}
