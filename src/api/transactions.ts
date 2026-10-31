import { apiRequest } from "./client.js";

export type TransactionSummary = {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  totalBalanceMinor: number;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
  parent_category_name: string | null;
  type: "income" | "expense";
  amount_minor: number;
  description: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getTransactionSummary() {
  return apiRequest("/api/transactions/summary", {
    method: "GET",
  });
}

export async function getTransactions() {
  return apiRequest("/api/transactions", {
    method: "GET",
  });
}

export type ImportRow = {
  categoryId: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  transactionDate: string;
};

export async function importTransactions(
  rows: ImportRow[],
  skipDuplicates: boolean,
) {
  return apiRequest("/api/transactions/import", {
    method: "POST",
    body: JSON.stringify({ rows, skipDuplicates }),
  });
}

// MoneyFlow Pro: suggested category id (or null) for each item, in order.
export async function suggestCategories(
  items: { description: string; type: "income" | "expense" }[],
): Promise<(string | null)[]> {
  const result = await apiRequest("/api/transactions/suggest-categories", {
    method: "POST",
    body: JSON.stringify({ items }),
  });

  return result.data.suggestions;
}
