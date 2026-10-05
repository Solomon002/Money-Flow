import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Plus,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { getTransactionSummary } from "../api/transactions.js";
import { getReport, type Report } from "../api/reports.js";

export default function DashboardPage() {
  const { user, onboardingPreferences } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState({
    totalIncomeMinor: 0,
    totalExpenseMinor: 0,
    totalBalanceMinor: 0,
  });

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [spendingReport, setSpendingReport] = useState<Report | null>(null);

  const [isLoadingSpending, setIsLoadingSpending] = useState(true);

  const [spendingError, setSpendingError] = useState("");

  const currencySymbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };

  const currencyCode = onboardingPreferences?.currency_code || "NGN";

  const currencySymbol = currencySymbols[currencyCode] || currencyCode;

  function formatDateInput(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatAmount(amountMinor: number) {
    return `${currencySymbol}${(Number(amountMinor) / 100).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    )}`;
  }

  useEffect(() => {
    async function loadSummary() {
      setIsLoadingSummary(true);
      setSummaryError("");

      try {
        const result = await getTransactionSummary();

        if (!result.response.ok) {
          throw new Error(
            result.data.message || "Unable to load your financial summary",
          );
        }

        setSummary(result.data.summary);
      } catch (error) {
        console.error("Loading transaction summary failed:", error);

        setSummaryError(
          error instanceof Error
            ? error.message
            : "Unable to load your financial summary",
        );
      } finally {
        setIsLoadingSummary(false);
      }
    }

    loadSummary();
  }, []);

  useEffect(() => {
    async function loadSpendingReport() {
      setIsLoadingSpending(true);
      setSpendingError("");

      const today = new Date();

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      try {
        const result = await getReport(
          formatDateInput(startOfMonth),
          formatDateInput(today),
        );

        if (!result.response.ok) {
          throw new Error(
            result.data.message || "Unable to load spending overview",
          );
        }

        setSpendingReport(result.data.report);
      } catch (error) {
        console.error("Loading spending overview failed:", error);

        setSpendingReport(null);

        setSpendingError(
          error instanceof Error
            ? error.message
            : "Unable to load spending overview",
        );
      } finally {
        setIsLoadingSpending(false);
      }
    }

    loadSpendingReport();
  }, []);

  const totalSpending =
    spendingReport?.spendingByCategory.reduce(
      (total, category) => total + Number(category.totalMinor),
      0,
    ) || 0;

  const isBalanceNegative = summary.totalBalanceMinor < 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Overview</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Welcome back, {user?.name}
          </h1>
        </div>
      </div>

      {summaryError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {summaryError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Total balance"
          value={
            isLoadingSummary
              ? "Loading..."
              : formatAmount(summary.totalBalanceMinor)
          }
          valueClassName={
            !isLoadingSummary && isBalanceNegative
              ? "text-red-600"
              : "text-slate-900"
          }
          icon={<Wallet size={20} />}
        />

        <SummaryCard
          title="Income"
          value={
            isLoadingSummary
              ? "Loading..."
              : formatAmount(summary.totalIncomeMinor)
          }
          icon={<ArrowDownLeft size={20} />}
        />

        <SummaryCard
          title="Expenses"
          value={
            isLoadingSummary
              ? "Loading..."
              : formatAmount(summary.totalExpenseMinor)
          }
          icon={<ArrowUpRight size={20} />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Spending overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your spending this month
              </p>
            </div>

            <Link
              to="/app/reports"
              className="text-sm font-semibold text-slate-900 hover:underline"
            >
              View reports
            </Link>
          </div>

          {spendingError ? (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {spendingError}
            </div>
          ) : isLoadingSpending ? (
            <div className="mt-6 flex h-56 items-center justify-center rounded-xl bg-slate-50">
              <p className="text-sm text-slate-500">
                Loading spending overview...
              </p>
            </div>
          ) : !spendingReport ||
            spendingReport.spendingByCategory.length === 0 ? (
            <div className="mt-6 flex h-56 items-center justify-center rounded-xl bg-slate-50">
              <div className="text-center">
                <TrendingUp size={32} className="mx-auto text-slate-400" />

                <p className="mt-3 text-sm text-slate-500">
                  No expenses recorded this month.
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/app/transactions/add")}
                  className="mt-3 text-sm font-semibold text-slate-900 hover:underline"
                >
                  Add a transaction
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              {spendingReport.spendingByCategory.slice(0, 5).map((category) => {
                const percentage =
                  totalSpending > 0
                    ? (Number(category.totalMinor) / totalSpending) * 100
                    : 0;

                return (
                  <div key={category.categoryId}>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-slate-700">
                        {category.categoryName}
                      </p>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatAmount(Number(category.totalMinor))}
                        </p>

                        <p className="text-xs text-slate-500">
                          {percentage.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-900 transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Total spending this month
                  </p>

                  <p className="text-sm font-bold text-slate-900">
                    {formatAmount(
                      Number(spendingReport.summary.totalExpenseMinor),
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Quick actions</h2>

          <div className="mt-5 space-y-3">
            <QuickAction
              icon={<Plus size={18} />}
              label="Add transaction"
              onClick={() => navigate("/app/transactions/add")}
            />

            <QuickAction
              icon={<Target size={18} />}
              label="Create goal"
              onClick={() => navigate("/app/goals/add")}
            />

            <QuickAction
              icon={<CreditCard size={18} />}
              label="Set a budget"
              onClick={() => navigate("/app/budgets/add")}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  valueClassName = "text-slate-900",
}: {
  title: string;
  value: string;
  icon: ReactNode;
  valueClassName?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>

        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">{icon}</div>
      </div>

      <p className={`mt-4 text-2xl font-bold ${valueClassName}`}>{value}</p>
    </section>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      <span className="flex items-center gap-3">
        <span className="text-slate-500">{icon}</span>

        {label}
      </span>

      <ArrowRight size={16} />
    </button>
  );
}
