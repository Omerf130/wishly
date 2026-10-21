export type SavingsEntry = {
  id: string;
  /** Display date (Hebrew-friendly string, demo only). */
  dateLabel: string;
  amount: number;
  actionLabel: string;
  note?: string;
};
