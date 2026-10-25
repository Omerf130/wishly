import type { DreamRecord } from '@/types/database';
import { devLogBackupImportFailure } from '@/utils/wishlyBackup/devBackupImportDiagnostic';
import {
  devGetImportValidationStage,
  devSetImportValidationStage,
} from '@/utils/wishlyBackup/devImportValidationStage';
import { BackupImportError } from '@/utils/wishlyBackup/importErrors';
import { assertRecognizedDreamImageBytes } from '@/utils/wishlyBackup/imageFileSignature';
import { extractWishlyBackupEntries, scanWishlyBackupZip } from '@/utils/wishlyBackup/safeBackupUnzip';
import { sha256Hex } from '@/utils/wishlyBackup/sha256';
import { parseBackupDataJsonBytes } from '@/utils/wishlyBackup/validateBackupData';
import { parseBackupManifestBytes } from '@/utils/wishlyBackup/validateBackupManifest';

function collectLocalImageReferencesFromDreams(dreams: DreamRecord[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const dream of dreams) {
    if (dream.imageType !== 'local') {
      continue;
    }
    const ref = dream.imageReference;
    if (!seen.has(ref)) {
      seen.add(ref);
      ordered.push(ref);
    }
  }
  return ordered;
}

export type BackupValidationSuccess = {
  ok: true;
  createdAt: string;
  dreamCount: number;
  transactionCount: number;
  imageCount: number;
  backupVersion: number;
  schemaVersion: number;
};

export type BackupValidationResult = BackupValidationSuccess | { ok: false; userMessage: string };

function logValidationFailure(error: unknown): void {
  devLogBackupImportFailure(
    { flowStage: 'validating', validationStage: devGetImportValidationStage() },
    error,
  );
}

export async function validateWishlyBackupZipBytes(
  zipBytes: Uint8Array,
): Promise<BackupValidationResult> {
  try {
    devSetImportValidationStage('scanning_zip');
    const scanned = scanWishlyBackupZip(zipBytes);
    const scannedNames = new Set(scanned.map((entry) => entry.name));

    if (!scannedNames.has('manifest.json') || !scannedNames.has('data.json')) {
      throw new BackupImportError('קובץ הגיבוי חסר manifest.json או data.json');
    }

    devSetImportValidationStage('extracting_manifest');
    const coreFiles = extractWishlyBackupEntries(
      zipBytes,
      new Set(['manifest.json', 'data.json']),
    );

    devSetImportValidationStage('validating_manifest');
    const manifest = parseBackupManifestBytes(coreFiles['manifest.json']!);

    devSetImportValidationStage('extracting_data');
    const dataBytes = coreFiles['data.json']!;

    if (manifest.dataJson.byteSize !== dataBytes.byteLength) {
      throw new BackupImportError('גודל data.json אינו תואם ל-manifest');
    }

    devSetImportValidationStage('verifying_checksums');
    const dataJsonSha256 = await sha256Hex(dataBytes);
    if (dataJsonSha256 !== manifest.dataJson.sha256) {
      throw new BackupImportError('checksum של data.json אינו תואם');
    }

    devSetImportValidationStage('validating_data');
    const data = parseBackupDataJsonBytes(dataBytes);

    if (data.dreams.length !== manifest.dreamCount) {
      throw new BackupImportError('מספר החלומות אינו תואם ל-manifest');
    }
    if (data.savingsTransactions.length !== manifest.transactionCount) {
      throw new BackupImportError('מספר הפעולות אינו תואם ל-manifest');
    }

    const requiredImageRefs = collectLocalImageReferencesFromDreams(data.dreams);
    if (requiredImageRefs.length !== manifest.imageCount) {
      throw new BackupImportError('מספר התמונות אינו תואם ל-manifest');
    }

    const expectedArchivePaths = new Set(
      manifest.images.map((image) => image.archivePath),
    );
    const expectedAllPaths = new Set(['manifest.json', 'data.json', ...expectedArchivePaths]);

    if (scannedNames.size !== expectedAllPaths.size) {
      throw new BackupImportError('קובץ הגיבוי מכיל קבצים לא צפויים');
    }
    for (const path of expectedAllPaths) {
      if (!scannedNames.has(path)) {
        throw new BackupImportError('קובץ הגיבוי חסר קבצים נדרשים');
      }
    }

    for (const reference of requiredImageRefs) {
      const manifestEntry = manifest.images.find((image) => image.imageReference === reference);
      if (!manifestEntry) {
        throw new BackupImportError('מטא-דאטה של תמונה חסר ב-manifest');
      }
    }

    if (expectedArchivePaths.size > 0) {
      devSetImportValidationStage('validating_images');
      const imageFiles = extractWishlyBackupEntries(zipBytes, expectedArchivePaths);

      for (const imageMeta of manifest.images) {
        const bytes = imageFiles[imageMeta.archivePath];
        if (!bytes) {
          throw new BackupImportError('קובץ תמונה חסר בגיבוי');
        }
        if (bytes.byteLength !== imageMeta.byteSize) {
          throw new BackupImportError('גודל תמונה אינו תואם ל-manifest');
        }
        const hash = await sha256Hex(bytes);
        if (hash !== imageMeta.sha256) {
          throw new BackupImportError('checksum של תמונה אינו תואם');
        }
        assertRecognizedDreamImageBytes(bytes);
      }
    }

    devSetImportValidationStage('completed');

    return {
      ok: true,
      createdAt: manifest.createdAt,
      dreamCount: manifest.dreamCount,
      transactionCount: manifest.transactionCount,
      imageCount: manifest.imageCount,
      backupVersion: manifest.backupVersion,
      schemaVersion: manifest.schemaVersion,
    };
  } catch (error) {
    if (error instanceof BackupImportError) {
      logValidationFailure(error);
      return { ok: false, userMessage: error.userMessage };
    }
    const wrapped = new BackupImportError('בדיקת קובץ הגיבוי נכשלה', { cause: error });
    logValidationFailure(wrapped);
    return { ok: false, userMessage: wrapped.userMessage };
  }
}
