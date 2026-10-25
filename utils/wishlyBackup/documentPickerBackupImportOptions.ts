export type DocumentPickerHostPlatform = 'android' | 'ios' | 'web' | 'unknown';

/**
 * Android: keep the SAF `content://` URI from ACTION_OPEN_DOCUMENT so the Expo File API
 * can read via ContentResolver (see expo-file-system FileSystemPath.checkPermission).
 * iOS: copy to cache (Document Picker default behavior).
 */
export function documentPickerCopyToCacheDirectoryForPlatform(
  platform: DocumentPickerHostPlatform,
): boolean {
  return platform === 'ios';
}
