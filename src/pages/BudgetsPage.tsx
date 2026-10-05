import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { deleteBudget, getBudgets, type Budget } from "../api/budgets.js";
import { getTransactions, type Transaction } from "../api/transactions.js";
import { useAuth } from "../context/AuthContext.js";

export default function BudgetsPage() {
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingBudgetId, setDeletingBudgetId] = useState("");

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

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [budgetsResult, transactionsResult] = await Promise.all([
          getBudgets(),
          getTransactions(),
        ]);

        if (!budgetsResult.response.ok) {
          throw new Error(
            budgetsResult.data.message || "Unable to load budgets",
          );
        }

        if (!transactionsResult.response.ok) {
          throw new Error(
            transactionsResult.data.message || "Unable to load transactions",
          );
        }

        setBudgets(budgetsResult.data.budgets);
        setTransactions(transactionsResult.data.transactions);
      } catch (error) {
        console.error("Loading budgets failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load budgets",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const currentBudgets = useMemo(() => {
    return budgets.filter(
      (budget) =>
        budget.month === selectedMonth && budget.year === selectedYear,
    );
  }, [budgets, selectedMonth, selectedYear]);

  function getSpentAmount(budget: Budget) {
    return transactions
      .filter((transaction) => {
        if (transaction.type !== "expense") {
          return false;
        }

        if (transaction.category_id !== budget.category_id) {
          return false;
        }

        const transactionDate = new Date(transaction.transaction_date);

        return (
          transactionDate.getMonth() + 1 === budget.month &&
          transactionDate.getFullYear() === budget.year
        );
      })
      .reduce(
        (total, transaction) => total + Number(transaction.amount_minor),
        0,
      );
  }

  function formatMoney(amountMinor: number) {
    return `${currencySymbol}${(amountMinor / 100).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function goToAddBudget() {
    navigate(`/app/budgets/add?month=${selectedMonth}&year=${selectedYear}`);
  }

  async function handleDeleteBudget(budget: Budget) {
    const confirmed = window.confirm(
      `Delete the ${budget.category_name} budget for ${budget.month}/${budget.year}?`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setDeletingBudgetId(budget.id);

    try {
      const result = await deleteBudget(budget.id);

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to delete budget");
      }

      setBudgets((currentBudgets) =>
        currentBudgets.filter(
          (currentBudget) => currentBudget.id !== budget.id,
        ),
      );
    } catch (error) {
      console.error("Deleting budget failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete budget",
      );
    } finally {
      setDeletingBudgetId("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/app")}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <p className="text-sm text-slate-500">Spending control</p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">Budgets</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={goToAddBudget}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add budget
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(Number(event.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
        >
          <option value={1}>January</option>
          <option value={2}>February</option>
          <option value={3}>March</option>
          <option value={4}>April</option>
          <option value={5}>May</option>
          <option value={6}>June</option>
          <option value={7}>July</option>
          <option value={8}>August</option>
          <option value={9}>September</option>
          <option value={10}>October</option>
          <option value={11}>November</option>
          <option value={12}>December</option>
        </select>

        <select
          value={selectedYear}
          onChange={(event) => setSelectedYear(Number(event.target.value))}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-900"
        >
          <option value={currentYear - 1}>{currentYear - 1}</option>

          <option value={currentYear}>{currentYear}</option>

          <option value={currentYear + 1}>{currentYear + 1}</option>
        </select>
      </div>

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Loading budgets...</p>
        </section>
      ) : currentBudgets.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No budgets yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create a budget for this month to start controlling your spending.
          </p>

          <button
            type="button"
            onClick={goToAddBudget}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Create budget
          </button>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {currentBudgets.map((budget) => {
            const budgetAmount = Number(budget.monthly_amount_minor);

            const spentAmount = getSpentAmount(budget);

            const remainingAmount = budgetAmount - spentAmount;

            const percentageUsed =
              budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;

            const displayedPercentage = Math.min(
              Math.max(percentageUsed, 0),
              100,
            );

            let warningMessage = "";
            let warningClass = "text-slate-500";

            if (percentageUsed >= 100) {
              warningMessage = "You are over this budget.";
              warningClass = "text-red-600";
            } else if (percentageUsed >= 90) {
              warningMessage = "You are very close to your budget limit.";
              warningClass = "text-orange-600";
            } else if (percentageUsed >= 70) {
              warningMessage = "You are approaching your budget limit.";
              warningClass = "text-amber-600";
            }

            const isDeleting = deletingBudgetId === budget.id;

            return (
              <section
                key={budget.id}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {budget.category_name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Monthly budget
                    </p>
                  </div>

                  <p className="text-lg font-bold text-slate-900">
                    {formatMoney(budgetAmount)}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Spent</span>

                    <span className="font-semibold text-slate-900">
                      {formatMoney(spentAmount)}
                    </span>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{
                        width: `${displayedPercentage}%`,
                      }}
                    />
                  </div>

                  {warningMessage && (
                    <p className={`mt-3 text-sm font-medium ${warningClass}`}>
                      {warningMessage}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      {percentageUsed.toFixed(0)}% used
                    </span>

                    <span
                      className={
                        remainingAmount >= 0
                          ? "font-semibold text-slate-700"
                          : "font-semibold text-red-600"
                      }
                    >
                      {remainingAmount >= 0
                        ? `${formatMoney(remainingAmount)} remaining`
                        : `${formatMoney(
                            Math.abs(remainingAmount),
                          )} over budget`}
                    </span>
                  </div>

                  <div className="mt-5 flex gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/budgets/edit/${budget.id}`)}
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBudget(budget)}
                      disabled={isDeleting}
                      className="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
