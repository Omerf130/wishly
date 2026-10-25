import type { BackupImportValidationStage } from '@/utils/wishlyBackup/devBackupImportDiagnostic';
import { isWishlyDevEnvironment } from '@/utils/wishlyBackup/isWishlyDevEnvironment';

let currentStage: BackupImportValidationStage = 'unknown';

export function devSetImportValidationStage(stage: BackupImportValidationStage): void {
  if (isWishlyDevEnvironment()) {
    currentStage = stage;
  }
}

export function devGetImportValidationStage(): BackupImportValidationStage {
  return currentStage;
}
