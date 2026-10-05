import { apiRequest } from "./client.js";

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  monthly_amount_minor: number;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

export async function getBudgets() {
  return apiRequest("/api/budgets", {
    method: "GET",
  });
}

export async function createBudget(data: {
  categoryId: string;
  monthlyAmount: number;
  month: number;
  year: number;
}) {
  return apiRequest("/api/budgets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBudget(
  budgetId: string,
  data: {
    categoryId: string;
    monthlyAmount: number;
    month: number;
    year: number;
  },
) {
  return apiRequest(`/api/budgets/${budgetId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteBudget(
  budgetId: string,
) {
  return apiRequest(`/api/budgets/${budgetId}`, {
    method: "DELETE",
  });
}