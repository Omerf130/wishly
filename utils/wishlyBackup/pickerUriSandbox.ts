import { Directory, Paths } from 'expo-file-system';

export function isPickerUriInAppCache(uri: string): boolean {
  try {
    const cacheUri = Paths.cache.uri;
    const documentUri = Paths.document.uri;
    return uri.startsWith(cacheUri) || uri.startsWith(documentUri);
  } catch {
    return false;
  }
}

export function wishlyBackupValidateImportDirectory(): Directory {
  return new Directory(Paths.cache, 'wishly-backup-validate');
}
