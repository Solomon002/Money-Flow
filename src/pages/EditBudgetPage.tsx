import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getCategories, type Category } from "../api/categories.js";
import { getBudgets, updateBudget, type Budget } from "../api/budgets.js";
import { useAuth } from "../context/AuthContext.js";

export default function EditBudgetPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { onboardingPreferences } = useAuth();

  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [categoryId, setCategoryId] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currencySymbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };

  const currencySymbol =
    currencySymbols[onboardingPreferences?.currency_code || "NGN"] ||
    onboardingPreferences?.currency_code ||
    "NGN";

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
            budgetsResult.data.message || "Unable to load budgets",
          );
        }

        if (!categoriesResult.response.ok) {
          throw new Error(
            categoriesResult.data.message || "Unable to load categories",
          );
        }

        const selectedBudget = budgetsResult.data.budgets.find(
          (item: Budget) => item.id === id,
        );

        if (!selectedBudget) {
          throw new Error("Budget not found");
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
          error instanceof Error ? error.message : "Unable to load budget",
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
      setErrorMessage("Budget ID is missing.");
      return;
    }

    if (!budget) {
      setErrorMessage("Budget could not be found.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Please select a category.");
      return;
    }

    const amountNumber = Number(monthlyAmount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage("Please enter a budget amount greater than zero.");
      return;
    }

    const originalAmount = Number(budget.monthly_amount_minor) / 100;

    const hasChanges =
      categoryId !== budget.category_id ||
      amountNumber !== originalAmount ||
      month !== budget.month ||
      year !== budget.year;

    if (!hasChanges) {
      setErrorMessage("No changes made.");
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
        throw new Error(result.data.message || "Unable to update budget");
      }

      navigate("/app/budgets");
    } catch (error) {
      console.error("Updating budget failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update budget",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Loading budget...</p>
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
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">Spending control</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Edit budget
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
                Category
              </label>

              <select
                id="budget-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="monthly-amount"
                className="block text-sm font-medium text-slate-700"
              >
                Monthly budget
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
                  Month
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
                  Year
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
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
