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