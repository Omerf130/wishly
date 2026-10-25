import { BackupExportError } from '@/utils/wishlyBackup/errors';
import { isWishlyDevEnvironment } from '@/utils/wishlyBackup/isWishlyDevEnvironment';

export type WishlyBackupFlowStage = 'creating' | 'sharing' | 'idle';

export type WishlyBackupExportStage =
  | 'cache_dir'
  | 'make_directory'
  | 'open_database'
  | 'read_snapshot'
  | 'collect_image_refs'
  | 'load_images'
  | 'assemble_zip'
  | 'write_zip_file'
  | 'unknown';

type DevBackupDiagnosticContext = {
  flowStage: WishlyBackupFlowStage;
  exportStage?: WishlyBackupExportStage;
};

function sanitizeDiagnosticText(value: string): string {
  return value
    .replace(/file:\/\/\S+/gi, '[file-uri]')
    .replace(/\/data\/user\/\S+/gi, '[app-path]')
    .replace(/\/storage\/\S+/gi, '[storage-path]');
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
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

/**
 * Dev-only Metro logging for backup failures. Does not log financial data, dream text, JSON, or private paths.
 */
export function devLogBackupFailure(
  context: DevBackupDiagnosticContext,
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
    exportStage: context.exportStage ?? 'unknown',
    errorName: primary instanceof Error ? primary.name : typeof error,
    errorMessage: primary instanceof Error ? sanitizeDiagnosticText(primary.message) : String(error),
    rootErrorName: root instanceof Error ? root.name : undefined,
    rootErrorMessage:
      root instanceof Error ? sanitizeDiagnosticText(root.message) : undefined,
    errorCode: errorCode(root) ?? errorCode(primary),
    isBackupExportError: error instanceof BackupExportError,
    stack: primary instanceof Error && primary.stack ? sanitizeDiagnosticText(primary.stack) : undefined,
  };

  console.warn('[Wishly backup diagnostic]', payload);
}
