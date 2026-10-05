import { apiRequest } from "./client.js";

export type InsightCategory = {
  categoryId: string;
  categoryName: string;
  totalMinor: number;
};

export type BudgetInsight = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentageUsed: number;
};

export type Insights = {
  currentIncomeMinor: number;
  currentExpenseMinor: number;
  previousIncomeMinor: number;
  previousExpenseMinor: number;
  spendingChangePercent: number;
  topSpendingCategories: InsightCategory[];
  budgetInsights: BudgetInsight[];
};

export async function getInsights() {
  return apiRequest("/api/insights", {
    method: "GET",
  });
}