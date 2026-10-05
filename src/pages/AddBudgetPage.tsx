import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getCategories, type Category } from "../api/categories.js";
import { createBudget } from "../api/budgets.js";
import { useAuth } from "../context/AuthContext.js";

export default function AddBudgetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { onboardingPreferences } = useAuth();

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const monthFromUrl = Number(searchParams.get("month"));
  const yearFromUrl = Number(searchParams.get("year"));

  const initialMonth =
    Number.isInteger(monthFromUrl) && monthFromUrl >= 1 && monthFromUrl <= 12
      ? monthFromUrl
      : currentMonth;

  const initialYear =
    Number.isInteger(yearFromUrl) && yearFromUrl >= 2000
      ? yearFromUrl
      : currentYear;

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");

  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

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
    async function loadCategories() {
      setIsLoadingCategories(true);
      setErrorMessage("");

      try {
        const result = await getCategories();

        if (!result.response.ok) {
          throw new Error(result.data.message || "Unable to load categories");
        }

        const expenseCategories = result.data.categories.filter(
          (category: Category) => category.kind === "expense",
        );

        setCategories(expenseCategories);
      } catch (error) {
        console.error("Loading budget categories failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load categories",
        );
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!categoryId) {
      setErrorMessage("Please select a category.");
      return;
    }

    const amountNumber = Number(monthlyAmount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage("Please enter a budget amount greater than zero.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await createBudget({
        categoryId,
        monthlyAmount: amountNumber,
        month,
        year,
      });

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to create budget");
      }

      navigate("/app/budgets");
    } catch (error) {
      console.error("Creating budget failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create budget",
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

          <h1 className="mt-1 text-2xl font-bold text-slate-900">Add budget</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

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
              disabled={isLoadingCategories}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingCategories
                  ? "Loading categories..."
                  : "Select a category"}
              </option>

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
                placeholder="0.00"
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
              disabled={isSaving || isLoadingCategories}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save budget"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
