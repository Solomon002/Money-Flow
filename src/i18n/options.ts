// Stored values for onboarding/settings choices. Labels come from
// t("options.incomeSource.<value>") and t("options.objective.<value>").

export const INCOME_SOURCES = [
  "salary",
  "freelance",
  "business",
  "investments",
  "family_support",
  "other",
] as const;

export const FINANCIAL_OBJECTIVES = [
  "control_spending",
  "save_more",
  "build_emergency_fund",
  "pay_off_debt",
  "reach_financial_goal",
  "understand_money",
  "other",
] as const;
