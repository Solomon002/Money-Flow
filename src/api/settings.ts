import { apiRequest } from "./client.js";

export type Appearance = "light" | "dark" | "system";

export type Settings = {
  id: string;
  name: string;
  email: string;
  created_at: string;

  currency_code: string;
  income_source: string | null;
  monthly_income_minor: number | null;
  monthly_savings_target_minor: number | null;
  financial_objective: string | null;

  appearance: Appearance;

  budget_alerts_enabled: boolean;
  goal_reminders_enabled: boolean;
  monthly_insights_enabled: boolean;
  recurring_reminders_enabled: boolean;

  has_financial_records: boolean;
};

export async function getSettings() {
  return apiRequest("/api/settings", {
    method: "GET",
  });
}

export async function updateSettings(data: {
  name: string;
  email: string;
  currencyCode: string;
  incomeSource: string | null;
  monthlyIncome: number | null;
  monthlySavingsTarget: number | null;
  financialObjective: string | null;
  appearance: Appearance;
  budgetAlertsEnabled: boolean;
  goalRemindersEnabled: boolean;
  monthlyInsightsEnabled: boolean;
  recurringRemindersEnabled: boolean;
}) {
  return apiRequest("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiRequest("/api/settings/password", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}