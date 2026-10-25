import type { BackupImportFileReadDevContext } from '@/utils/wishlyBackup/devBackupImportFileReadContext';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { isWishlyDevEnvironment } from '@/utils/wishlyBackup/isWishlyDevEnvironment';

export type BackupImportUiFlowStage = 'idle' | 'picking' | 'validating';

export type BackupImportValidationStage =
  | 'picking_file'
  | 'copying_to_cache'
  | 'reading_file'
  | 'scanning_zip'
  | 'extracting_manifest'
  | 'validating_manifest'
  | 'extracting_data'
  | 'validating_data'
  | 'verifying_checksums'
  | 'validating_images'
  | 'completed'
  | 'unknown';

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/file:\/\/\S+/gi, '[file-uri]')
    .replace(/content:\/\/\S+/gi, '[content-uri]')
    .replace(/\/data\/user\/\S+/gi, '[app-path]')
    .replace(/\/storage\/\S+/gi, '[storage-path]');
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') {
    return code;
  }
  if (typeof code === 'number') {
    return String(code);
  }
  return undefined;
}

function unwrapErrorChain(error: unknown): Error[] {
  const chain: Error[] = [];
  let current: unknown = error;
  const seen = new Set<unknown>();

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = (current as Error & { cause?: unknown }).cause;
  }

  return chain;
}

export function devLogBackupImportFailure(
  context: {
    flowStage: BackupImportUiFlowStage;
    validationStage: BackupImportValidationStage;
    fileRead?: BackupImportFileReadDevContext;
  },
  error: unknown,
): void {
  if (!isWishlyDevEnvironment()) {
    return;
  }

  const chain = unwrapErrorChain(error);
  const primary = chain[0];
  const root = chain[chain.length - 1] ?? primary;

  const payload = {
    flowStage: context.flowStage,
    validationStage: context.validationStage,
    ...(context.fileRead ? { fileRead: context.fileRead } : {}),
    errorName: primary instanceof Error ? primary.name : typeof error,
    errorMessage:
      primary instanceof Error ? sanitizeDiagnosticText(primary.message) : String(error),
    rootErrorName: root instanceof Error ? root.name : undefined,
    rootErrorMessage:
      root instanceof Error ? sanitizeDiagnosticText(root.message) : undefined,
    errorCode: errorCode(root) ?? errorCode(primary),
    isBackupImportError: error instanceof BackupImportError,
  };

  console.warn('[Wishly backup import diagnostic]', payload);
}

/** Log when validation returns `{ ok: false }` without throwing. */
export function devLogBackupImportValidationResult(
  context: {
    flowStage: BackupImportUiFlowStage;
    validationStage: BackupImportValidationStage;
  },
  userMessage: string,
): void {
  if (!isWishlyDevEnvironment()) {
    return;
  }

  devLogBackupImportFailure(context, new BackupImportError(userMessage));
}
