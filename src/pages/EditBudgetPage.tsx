import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getCategories, type Category } from "../api/categories.js";
import { getBudgets, updateBudget, type Budget } from "../api/budgets.js";
import { useAuth } from "../context/AuthContext.js";
import { MONTHS, currencySymbol as getCurrencySymbol, monthName } from "../i18n/format.js";
import { categoryLabel } from "../i18n/categories.js";

export default function EditBudgetPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { onboardingPreferences } = useAuth();
  const { t } = useTranslation();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currencySymbol = getCurrencySymbol(
    onboardingPreferences?.currency_code || "NGN",
  );

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [budgetsResult, categoriesResult] = await Promise.all([
          getBudgets(),
          getCategories(),
        ]);

        if (!budgetsResult.response.ok) {
          throw new Error(
            budgetsResult.data.message || t("budgets.loadFailed"),
          );
        }

        if (!categoriesResult.response.ok) {
          throw new Error(
            categoriesResult.data.message || t("transactions.categoriesFailed"),
          );
        }

        const selectedBudget = budgetsResult.data.budgets.find(
          (item: Budget) => item.id === id,
        );

        if (!selectedBudget) {
          throw new Error(t("budgets.notFound"));
        }

        const expenseCategories = categoriesResult.data.categories.filter(
          (category: Category) => category.kind === "expense",
        );

        setBudget(selectedBudget);
        setCategories(expenseCategories);
        setCategoryId(selectedBudget.category_id);
        setMonthlyAmount(
          (Number(selectedBudget.monthly_amount_minor) / 100).toString(),
        );
        setMonth(selectedBudget.month);
        setYear(selectedBudget.year);
      } catch (error) {
        console.error("Loading budget failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : t("budgets.loadOneFailed"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!id) {
      setErrorMessage(t("budgets.notFound"));
      return;
    }

    if (!budget) {
      setErrorMessage(t("budgets.notFound"));
      return;
    }

    if (!categoryId) {
      setErrorMessage(t("transactions.form.selectCategoryError"));
      return;
    }

    const amountNumber = Number(monthlyAmount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage(t("budgets.form.amountError"));
      return;
    }

    const originalAmount = Number(budget.monthly_amount_minor) / 100;

    const hasChanges =
      categoryId !== budget.category_id ||
      amountNumber !== originalAmount ||
      month !== budget.month ||
      year !== budget.year;

    if (!hasChanges) {
      setErrorMessage(t("budgets.form.noChanges"));
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateBudget(id, {
        categoryId,
        monthlyAmount: amountNumber,
        month,
        year,
      });

      if (!result.response.ok) {
        throw new Error(result.data.message || t("budgets.form.updateFailed"));
      }

      navigate("/app/budgets");
    } catch (error) {
      console.error("Updating budget failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : t("budgets.form.updateFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const monthOptions = MONTHS.map((value) => ({
    value,
    label: monthName(value),
  }));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{t("budgets.loadingOne")}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/budgets")}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">{t("budgets.eyebrow")}</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t("budgets.edit")}
          </h1>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {budget && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="budget-category"
                className="block text-sm font-medium text-slate-700"
              >
                {t("common.category")}
              </label>

              <select
                id="budget-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {categoryLabel(category.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="monthly-amount"
                className="block text-sm font-medium text-slate-700"
              >
                {t("budgets.monthly")}
              </label>

              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  {currencySymbol}
                </span>

                <input
                  id="monthly-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monthlyAmount}
                  onChange={(event) => setMonthlyAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="budget-month"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t("common.month")}
                </label>

                <select
                  id="budget-month"
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                >
                  {monthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="budget-year"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t("common.year")}
                </label>

                <input
                  id="budget-year"
                  type="number"
                  min="2000"
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/app/budgets")}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("common.cancel")}
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? t("common.saving") : t("common.saveChanges")}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
