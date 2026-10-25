import type { DreamRecord, DreamStatus, SavingsTransactionRecord } from '@/types/database';

type DreamRow = {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  image_type: 'builtIn' | 'local';
  image_reference: string;
  accent_color: string;
  monthly_savings_agorot: number | null;
  target_date: string | null;
  status: DreamStatus;
  created_at: string;
  updated_at: string;
};

type TransactionRow = {
  id: string;
  dream_id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export function mapDreamRow(row: DreamRow): DreamRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    targetAmount: row.target_amount,
    imageType: row.image_type,
    imageReference: row.image_reference,
    accentColor: row.accent_color,
    monthlySavingsAgorot: row.monthly_savings_agorot,
    targetDate: row.target_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTransactionRow(row: TransactionRow): SavingsTransactionRecord {
  return {
    id: row.id,
    dreamId: row.dream_id,
    type: row.type,
    amount: row.amount,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
