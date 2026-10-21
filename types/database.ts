export type DreamStatus = 'active' | 'completed' | 'archived';

export type DreamImageType = 'builtIn' | 'local';

export type SavingsTransactionType = 'deposit' | 'withdrawal';

export type DreamRecord = {
  id: string;
  title: string;
  description: string | null;
  targetAmount: number;
  imageType: DreamImageType;
  imageReference: string;
  accentColor: string;
  plannedMonthlySaving: number | null;
  status: DreamStatus;
  createdAt: string;
  updatedAt: string;
};

export type SavingsTransactionRecord = {
  id: string;
  dreamId: string;
  type: SavingsTransactionType;
  amount: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDreamInput = {
  title: string;
  description?: string | null;
  targetAmountAgorot: number;
  imageType: DreamImageType;
  imageReference: string;
  accentColor: string;
  plannedMonthlySavingAgorot?: number | null;
  /** Opening balance represented as an initial deposit transaction. */
  initialSavedAmountAgorot?: number;
};

export type UpdateDreamInput = {
  title?: string;
  description?: string | null;
  targetAmountAgorot?: number;
  imageType?: DreamImageType;
  imageReference?: string;
  accentColor?: string;
  plannedMonthlySavingAgorot?: number | null;
  status?: DreamStatus;
};

export type CreateTransactionInput = {
  dreamId: string;
  amountAgorot: number;
  note?: string | null;
};

export type UpdateTransactionInput = {
  amountAgorot?: number;
  note?: string | null;
};
