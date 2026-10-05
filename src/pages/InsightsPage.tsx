import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getInsights, type Insights } from "../api/insights.js";
import { useAuth } from "../context/AuthContext.js";

export default function InsightsPage() {
  const { onboardingPreferences } = useAuth();

  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
    async function loadInsights() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getInsights();

        if (!result.response.ok) {
          throw new Error(result.data.message || "Unable to load insights");
        }

        setInsights(result.data.insights);
      } catch (error) {
        console.error("Loading insights failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load insights",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInsights();
  }, []);

  function formatAmount(amountMinor: number) {
    return `${currencySymbol}${(amountMinor / 100).toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  const topCategoryTotal = useMemo(() => {
    if (!insights) {
      return 0;
    }

    return insights.topSpendingCategories.reduce(
      (total, category) => total + category.totalMinor,
      0,
    );
  }, [insights]);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading insights...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-500">Financial patterns</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">Insights</h1>
        </div>

        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No insights available yet.</p>
      </div>
    );
  }

  const spendingIncreased = insights.spendingChangePercent > 0;

  const spendingDecreased = insights.spendingChangePercent < 0;

  const spendingChange = Math.abs(insights.spendingChangePercent);

  const budgetWarnings = insights.budgetInsights.filter(
    (budget) => budget.percentageUsed >= 90,
  );

  const budgetHealthy =
    insights.budgetInsights.length > 0 &&
    insights.budgetInsights.every((budget) => budget.percentageUsed < 90);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500">Financial patterns</p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">Insights</h1>

        <p className="mt-2 text-sm text-slate-500">
          Understand what your recent money activity is telling you.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <ArrowUpRight size={20} />
            </div>

            <div>
              <p className="text-sm text-slate-500">This month's spending</p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatAmount(insights.currentExpenseMinor)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm">
            {spendingIncreased ? (
              <>
                <TrendingUp size={16} className="text-red-600" />
                <span className="font-medium text-red-600">
                  {spendingChange.toFixed(1)}% higher
                </span>
              </>
            ) : spendingDecreased ? (
              <>
                <TrendingDown size={16} className="text-emerald-600" />
                <span className="font-medium text-emerald-600">
                  {spendingChange.toFixed(1)}% lower
                </span>
              </>
            ) : (
              <span className="font-medium text-slate-600">No change</span>
            )}

            <span className="text-slate-400">vs last month</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <ArrowDownLeft size={20} />
            </div>

            <div>
              <p className="text-sm text-slate-500">This month's income</p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatAmount(insights.currentIncomeMinor)}
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            Last month:{" "}
            <span className="font-medium text-slate-700">
              {formatAmount(insights.previousIncomeMinor)}
            </span>
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            What stands out
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A quick summary of your current financial activity.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {spendingIncreased && (
            <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-600" />

              <div>
                <p className="font-medium text-red-900">
                  Spending has increased
                </p>

                <p className="mt-1 text-sm text-red-700">
                  Your spending is {spendingChange.toFixed(1)}% higher than last
                  month.
                </p>
              </div>
            </div>
          )}

          {spendingDecreased && (
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <div>
                <p className="font-medium text-emerald-900">Spending is down</p>

                <p className="mt-1 text-sm text-emerald-700">
                  Your spending is {spendingChange.toFixed(1)}% lower than last
                  month.
                </p>
              </div>
            </div>
          )}

          {!spendingIncreased && !spendingDecreased && (
            <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-slate-600"
              />

              <div>
                <p className="font-medium text-slate-900">
                  Spending is unchanged
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Your spending is currently at the same level as last month.
                </p>
              </div>
            </div>
          )}

          {budgetWarnings.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="font-medium text-amber-900">
                  Some budgets need attention
                </p>

                <p className="mt-1 text-sm text-amber-700">
                  {budgetWarnings.length}{" "}
                  {budgetWarnings.length === 1 ? "budget is" : "budgets are"} at
                  90% or more of their limit.
                </p>
              </div>
            </div>
          )}

          {budgetHealthy && (
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600"
              />

              <div>
                <p className="font-medium text-emerald-900">
                  Your budgets are on track
                </p>

                <p className="mt-1 text-sm text-emerald-700">
                  None of your current budgets have reached 90% of their limits.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Top spending categories
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Where your money is going this month.
          </p>
        </div>

        {insights.topSpendingCategories.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-500">
              No expense transactions recorded this month yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {insights.topSpendingCategories.map((category) => {
              const percentage =
                topCategoryTotal > 0
                  ? (category.totalMinor / topCategoryTotal) * 100
                  : 0;

              return (
                <div key={category.categoryId}>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-slate-700">
                      {category.categoryName}
                    </p>

                    <p className="text-sm font-semibold text-slate-900">
                      {formatAmount(category.totalMinor)}
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Budget insights
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            How your current monthly budgets are performing.
          </p>
        </div>

        {insights.budgetInsights.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
            <p className="text-sm text-slate-500">
              You have not created any budgets for this month yet.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {insights.budgetInsights.map((budget) => {
              const percentage = Math.min(budget.percentageUsed, 100);

              const isWarning = budget.percentageUsed >= 90;

              return (
                <div key={budget.budgetId}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {budget.categoryName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatAmount(budget.spentMinor)} of{" "}
                        {formatAmount(budget.budgetMinor)}
                      </p>
                    </div>

                    <p
                      className={`text-sm font-semibold ${
                        isWarning ? "text-amber-600" : "text-slate-900"
                      }`}
                    >
                      {budget.percentageUsed.toFixed(0)}%
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        isWarning ? "bg-amber-500" : "bg-slate-900"
                      }`}
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>

                  <p
                    className={`mt-2 text-xs ${
                      budget.remainingMinor < 0
                        ? "text-red-600"
                        : "text-slate-500"
                    }`}
                  >
                    {budget.remainingMinor >= 0
                      ? `${formatAmount(budget.remainingMinor)} remaining`
                      : `${formatAmount(
                          Math.abs(budget.remainingMinor),
                        )} over budget`}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
