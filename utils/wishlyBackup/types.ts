import type { DreamRecord, SavingsTransactionRecord } from '@/types/database';

export const WISHLY_BACKUP_FORMAT = 'wishly.backup' as const;
export const WISHLY_BACKUP_VERSION = 1;
export const WISHLY_APPLICATION_ID = 'wishly';

export type WishlyBackupDataJson = {
  dreams: DreamRecord[];
  savingsTransactions: SavingsTransactionRecord[];
};

export type WishlyBackupImageManifestEntry = {
  archivePath: string;
  imageReference: string;
  sha256: string;
  byteSize: number;
  contentType: string;
};

export type WishlyBackupFileChecksum = {
  sha256: string;
  byteSize: number;
};

export type WishlyBackupManifest = {
  format: typeof WISHLY_BACKUP_FORMAT;
  backupVersion: number;
  createdAt: string;
  applicationId: typeof WISHLY_APPLICATION_ID;
  appVersion: string;
  schemaVersion: number;
  encrypted: false;
  encryptionNotice: string;
  dreamCount: number;
  transactionCount: number;
  imageCount: number;
  dataJson: WishlyBackupFileChecksum;
  images: WishlyBackupImageManifestEntry[];
};

export type BackupExportResult = {
  fileUri: string;
  byteSize: number;
  dreamCount: number;
  transactionCount: number;
  imageCount: number;
  createdAt: string;
};

export type BackupImagePayload = {
  imageReference: string;
  bytes: Uint8Array;
};
