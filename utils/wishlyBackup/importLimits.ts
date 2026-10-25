import { BACKUP_LIMITS } from '@/utils/wishlyBackup/limits';

export const BACKUP_IMPORT_LIMITS = {
  ...BACKUP_LIMITS,
  maxZipEntries: 512,
  /** Sum of declared uncompressed sizes before extraction. */
  maxUncompressedTotalBytes: 110 * 1024 * 1024,
  maxManifestBytes: 2 * 1024 * 1024,
  maxDataJsonBytes: 32 * 1024 * 1024,
} as const;

export const SUPPORTED_BACKUP_VERSION = 1;
export const SUPPORTED_MAX_SCHEMA_VERSION = 2;
