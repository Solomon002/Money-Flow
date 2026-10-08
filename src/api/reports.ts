import { apiRequest } from "./client.js";

export type ReportSummary = {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  totalBalanceMinor: number;
};

export type SpendingByCategory = {
  categoryId: string;
  categoryName: string;
  totalMinor: number;
};

export type SpendingBreakdown = {
  parentCategoryId: string;
  parentCategoryName: string;
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  totalMinor: number;
};

export type Report = {
  startDate: string;
  endDate: string;
  summary: ReportSummary;
  spendingByCategory: SpendingByCategory[];
  spendingBreakdown: SpendingBreakdown[];
};

export async function getReport(
  startDate: string,
  endDate: string,
) {
  return apiRequest(
    `/api/reports?startDate=${encodeURIComponent(
      startDate,
    )}&endDate=${encodeURIComponent(endDate)}`,
    {
      method: "GET",
    },
  );
}