export type PickerUriScheme = 'content' | 'file' | 'other';

export type BackupImportFileReadFailurePhase = 'construct' | 'stat' | 'read' | 'import_copy';

export type BackupImportFileReadDevContext = {
  uriScheme: PickerUriScheme;
  assetSizePresent: boolean;
  documentPickerCopyToCacheDirectory?: boolean;
  uriInAppCache: boolean;
  fileExistsValue?: boolean;
  fileSizeValueAvailable: boolean;
  fileSizeValue?: number;
  fileApiStatAttempted: boolean;
  fileApiStatSucceeded: boolean;
  fileApiReadAttempted: boolean;
  fileApiReadSucceeded: boolean;
  fileApiImportAttempted: boolean;
  fileApiImportSucceeded: boolean;
  fileApiFailurePhase?: BackupImportFileReadFailurePhase;
};

export function devClassifyPickerUriScheme(uri: string): PickerUriScheme {
  if (uri.startsWith('content://')) {
    return 'content';
  }
  if (uri.startsWith('file://')) {
    return 'file';
  }
  return 'other';
}

export function createBackupImportFileReadDevContext(
  uri: string,
  options?: {
    knownSize?: number;
    documentPickerCopyToCacheDirectory?: boolean;
    uriInAppCache?: boolean;
  },
): BackupImportFileReadDevContext {
  return {
    uriScheme: devClassifyPickerUriScheme(uri),
    assetSizePresent: typeof options?.knownSize === 'number',
    documentPickerCopyToCacheDirectory: options?.documentPickerCopyToCacheDirectory,
    uriInAppCache: options?.uriInAppCache ?? false,
    fileSizeValueAvailable: false,
    fileApiStatAttempted: false,
    fileApiStatSucceeded: false,
    fileApiReadAttempted: false,
    fileApiReadSucceeded: false,
    fileApiImportAttempted: false,
    fileApiImportSucceeded: false,
  };
}
