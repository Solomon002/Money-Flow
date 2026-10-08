import { apiRequest } from "./client.js";

export type AdvancedReportSummary = {
  totalIncomeMinor: number;
  totalExpenseMinor: number;
  totalBalanceMinor: number;
};

export type AdvancedSpendingBreakdown = {
  parentCategoryId: string;
  parentCategoryName: string;
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  totalMinor: number;
};

export type TopSpendingTransaction = {
  id: string;
  categoryId: string;
  categoryName: string;
  parentCategoryName: string | null;
  type: "expense";
  amountMinor: number;
  description: string;
  transactionDate: string;
};

export type BudgetPerformance = {
  id: string;
  categoryId: string;
  categoryName: string;
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentageUsed: number;
  month: number;
  year: number;
};

export type AdvancedReport = {
  startDate: string;
  endDate: string;
  summary: AdvancedReportSummary;
  spendingBreakdown: AdvancedSpendingBreakdown[];
  topSpendingTransactions: TopSpendingTransaction[];
  budgetPerformance: BudgetPerformance[];
};

export async function getAdvancedReport(
  startDate: string,
  endDate: string,
) {
  return apiRequest(
    `/api/advanced-reports?startDate=${encodeURIComponent(
      startDate,
    )}&endDate=${encodeURIComponent(endDate)}`,
    {
      method: "GET",
    },
  );
}

export type AnalyticsCategoryRow = {
  categoryId: string;
  categoryName: string;
  totalMinor: number;
  percentage: number;
};

export type AnalyticsSubCategoryRow = {
  categoryId: string;
  categoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
  totalMinor: number;
  percentage: number;
};

export type AnalyticsTimeSeriesPoint = {
  bucket: string;
  incomeMinor: number;
  expenseMinor: number;
};

export type AnalyticsTopTransaction = {
  id: string;
  description: string;
  categoryName: string;
  parentCategoryName: string | null;
  amountMinor: number;
  transactionDate: string;
};

export type AdvancedAnalytics = {
  startDate: string;
  endDate: string;
  bucket: "day" | "week";
  topCategories: AnalyticsCategoryRow[];
  topSubCategories: AnalyticsSubCategoryRow[];
  categoryDonut: AnalyticsCategoryRow[];
  incomeVsExpense: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    totalBalanceMinor: number;
    incomePercentage: number;
    expensePercentage: number;
  };
  timeSeries: AnalyticsTimeSeriesPoint[];
  topTransactions: AnalyticsTopTransaction[];
};

export async function getAdvancedAnalytics(
  startDate: string,
  endDate: string,
) {
  return apiRequest(
    `/api/advanced-reports/analytics?startDate=${encodeURIComponent(
      startDate,
    )}&endDate=${encodeURIComponent(endDate)}`,
    {
      method: "GET",
    },
  ) as Promise<{
    response: Response;
    data: {
      status: string;
      analytics: AdvancedAnalytics;
      message?: string;
    };
  }>;
}