import i18n from "./index.js";

/*
 * Every account is seeded with English default categories (see the
 * moneyflow_initialize_user trigger). They are shown translated; any
 * category the user named themselves is shown exactly as typed.
 */
const DEFAULT_CATEGORY_KEYS: Record<string, string> = {
  Food: "food",
  Transport: "transport",
  Shopping: "shopping",
  Bills: "bills",
  Entertainment: "entertainment",
  Health: "health",
  Education: "education",
  Housing: "housing",
  Other: "other",
  Salary: "salary",
  Freelance: "freelance",
  Business: "business",
  Gift: "gift",
};

export function categoryLabel(name: string | null | undefined): string {
  if (!name) {
    return i18n.t("common.uncategorized");
  }

  const key = DEFAULT_CATEGORY_KEYS[name];

  return key ? i18n.t(`categories.${key}`) : name;
}
