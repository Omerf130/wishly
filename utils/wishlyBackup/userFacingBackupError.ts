import { BackupExportError } from '@/utils/wishlyBackup/errors';

function isStorageFullError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('enospc') ||
    message.includes('no space') ||
    message.includes('not enough space') ||
    message.includes('storage full') ||
    message.includes('quota')
  );
}

export function toUserFacingBackupError(error: unknown): string {
  if (error instanceof BackupExportError) {
    return error.userMessage;
  }

  if (isStorageFullError(error)) {
    return 'אין מספיק מקום פנוי במכשיר ליצירת הגיבוי';
  }

  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('sqlite') || message.includes('database')) {
    return 'שגיאה בקריאת הנתונים. נסו שוב.';
  }

  return 'יצירת הגיבוי נכשלה. נסו שוב.';
}
