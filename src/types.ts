export type EntryType = 'income' | 'expense';
export type Transaction = {
  id: string; name: string; category: string; type: EntryType;
  amount: number; date: string; note?: string;
};
export type Budget = { id: string; category: string; limit: number };
export type Goal = { id: string; name: string; target: number; saved: number; dueDate?: string };
