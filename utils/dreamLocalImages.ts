import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

import { generateId } from '@/database/ids';

/** Relative path segment stored in SQLite `image_reference` for `image_type = 'local'`. */
export const DREAM_IMAGES_DIR = 'dream-images';

const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic']);

function dreamImagesDirectoryUri(): string {
  if (!documentDirectory) {
    throw new Error('אחסון המכשיר אינו זמין');
  }
  return `${documentDirectory}${DREAM_IMAGES_DIR}/`;
}

export function resolveRelativeDreamImageUri(relativePath: string): string {
  if (!documentDirectory) {
    return relativePath;
  }
  const normalized = relativePath.replace(/^\/+/, '');
  return `${documentDirectory}${normalized}`;
}

function extensionFromPickerUri(uri: string): string {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const match = /\.(\w+)$/.exec(withoutQuery);
  const ext = match?.[1]?.toLowerCase();
  if (ext && SUPPORTED_EXTENSIONS.has(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

export async function ensureDreamImagesDirectory(): Promise<void> {
  await makeDirectoryAsync(dreamImagesDirectoryUri(), { intermediates: true });
}

export async function dreamImageFileExists(relativePath: string): Promise<boolean> {
  const info = await getInfoAsync(resolveRelativeDreamImageUri(relativePath));
  return info.exists && !info.isDirectory;
}

/**
 * Copies a gallery pick into app-private storage. Returns a stable relative path for SQLite.
 */
export async function copyPickerImageToDreamStore(pickerUri: string): Promise<string> {
  await ensureDreamImagesDirectory();
  const extension = extensionFromPickerUri(pickerUri);
  const relativePath = `${DREAM_IMAGES_DIR}/${generateId()}.${extension}`;
  const destinationUri = resolveRelativeDreamImageUri(relativePath);

  await copyAsync({ from: pickerUri, to: destinationUri });

  const info = await getInfoAsync(destinationUri);
  if (!info.exists || info.isDirectory) {
    await deleteAsync(destinationUri, { idempotent: true });
    throw new Error('העתקת התמונה נכשלה');
  }

  return relativePath;
}

export async function deleteDreamImageFile(relativePath: string): Promise<void> {
  const uri = resolveRelativeDreamImageUri(relativePath);
  await deleteAsync(uri, { idempotent: true });
}
