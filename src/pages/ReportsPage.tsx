import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getReport, type Report } from "../api/reports.js";
import { useAuth } from "../context/AuthContext.js";

type ReportPeriod =
  | "this-week"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "custom";

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getPeriodDates(period: ReportPeriod) {
  const today = new Date();

  if (period === "this-week") {
    const dayOfWeek = today.getDay();

    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const start = new Date(today);

    start.setDate(today.getDate() + mondayOffset);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(today),
    };
  }

  if (period === "this-month") {
    return {
      startDate: formatDateInput(getMonthStart(today)),
      endDate: formatDateInput(today),
    };
  }

  if (period === "last-month") {
    const previousMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );

    return {
      startDate: formatDateInput(getMonthStart(previousMonth)),
      endDate: formatDateInput(getMonthEnd(previousMonth)),
    };
  }

  if (period === "last-3-months") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(today),
    };
  }

  return {
    startDate: formatDateInput(today),
    endDate: formatDateInput(today),
  };
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();

  const [period, setPeriod] = useState<ReportPeriod>("this-month");

  const initialDates = useMemo(() => getPeriodDates("this-month"), []);

  const [startDate, setStartDate] = useState(initialDates.startDate);

  const [endDate, setEndDate] = useState(initialDates.endDate);

  const [report, setReport] = useState<Report | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const currencySymbols: Record<string, string> = {
    NGN: "₦",
    USD: "$",
    GBP: "£",
    EUR: "€",
  };

  const currencyCode = onboardingPreferences?.currency_code || "NGN";

  const currencySymbol = currencySymbols[currencyCode] || currencyCode;

  function formatMoney(amountMinor: number) {
    return `${currencySymbol}${(Number(amountMinor) / 100).toLocaleString(
      "en-NG",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;
  }

  function formatDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);

    const parsedDate = new Date(year, month - 1, day);

    return parsedDate.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async function loadReport(
    selectedStartDate: string,
    selectedEndDate: string,
  ) {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await getReport(selectedStartDate, selectedEndDate);

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to load report");
      }

      setReport(result.data.report);
    } catch (error) {
      console.error("Loading report failed:", error);

      setReport(null);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load report",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (period === "custom") {
      return;
    }

    const dates = getPeriodDates(period);

    setStartDate(dates.startDate);
    setEndDate(dates.endDate);

    loadReport(dates.startDate, dates.endDate);
  }, [period]);

  function handlePeriodChange(selectedPeriod: ReportPeriod) {
    setPeriod(selectedPeriod);
  }

  function handleCustomReport() {
    if (!startDate || !endDate) {
      setErrorMessage("Please select both a start date and an end date.");
      return;
    }

    if (startDate > endDate) {
      setErrorMessage("Start date cannot be after end date.");
      return;
    }

    loadReport(startDate, endDate);
  }

  const totalSpending = useMemo(() => {
    if (!report) {
      return 0;
    }

    return report.spendingByCategory.reduce(
      (total, category) => total + Number(category.totalMinor),
      0,
    );
  }, [report]);

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
            <p className="text-sm text-slate-500">Understand your money</p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">Reports</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays size={18} />

          {report
            ? `${formatDate(report.startDate)} – ${formatDate(report.endDate)}`
            : "Select a period"}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["this-week", "This week"],
            ["this-month", "This month"],
            ["last-month", "Last month"],
            ["last-3-months", "Last 3 months"],
            ["custom", "Custom"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handlePeriodChange(value as ReportPeriod)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                period === value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="report-start-date"
                className="block text-sm font-medium text-slate-700"
              >
                Start date
              </label>

              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="report-end-date"
                className="block text-sm font-medium text-slate-700"
              >
                End date
              </label>

              <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleCustomReport}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Generate report
              </button>
            </div>
          </div>
        )}
      </section>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">Loading report...</p>
        </section>
      ) : !report ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <BarChart3 size={24} className="text-slate-700" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No report available
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Select another date range and try again.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Income</p>

                <div className="rounded-xl bg-green-50 p-2">
                  <TrendingUp size={18} className="text-green-600" />
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {formatMoney(report.summary.totalIncomeMinor)}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Expenses</p>

                <div className="rounded-xl bg-red-50 p-2">
                  <TrendingDown size={18} className="text-red-600" />
                </div>
              </div>

              <p className="mt-4 text-2xl font-bold text-slate-900">
                {formatMoney(report.summary.totalExpenseMinor)}
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  Net balance
                </p>

                <div className="rounded-xl bg-slate-100 p-2">
                  <BarChart3 size={18} className="text-slate-700" />
                </div>
              </div>

              <p
                className={`mt-4 text-2xl font-bold ${
                  report.summary.totalBalanceMinor >= 0
                    ? "text-slate-900"
                    : "text-red-600"
                }`}
              >
                {formatMoney(report.summary.totalBalanceMinor)}
              </p>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Spending by category
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                See where your money went during this period.
              </p>
            </div>

            {report.spendingByCategory.length === 0 ? (
              <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-500">
                  No expenses recorded during this period.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {report.spendingByCategory.map((category) => {
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
                            {formatMoney(Number(category.totalMinor))}
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
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
