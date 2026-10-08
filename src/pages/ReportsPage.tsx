import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getReport, type Report } from "../api/reports.js";
import {
  getAdvancedReport,
  type AdvancedReport,
} from "../api/advancedReports.js";
import AdvancedReportsTab from "../components/AdvancedReportsTab.js";
import { useAuth } from "../context/AuthContext.js";
import { getSubscription, type Subscription } from "../api/subscription.js";

type ReportPeriod =
  | "this-week"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "custom";

type ReportsTab = "basic" | "advanced";

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

  const [activeTab, setActiveTab] = useState<ReportsTab>("basic");
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [period, setPeriod] = useState<ReportPeriod>("this-month");

  const initialDates = useMemo(() => getPeriodDates("this-month"), []);

  const [startDate, setStartDate] = useState(initialDates.startDate);
  const [endDate, setEndDate] = useState(initialDates.endDate);

  const [report, setReport] = useState<Report | null>(null);

  const [advancedReport, setAdvancedReport] = useState<AdvancedReport | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [advancedErrorMessage, setAdvancedErrorMessage] = useState("");

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

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

  function formatTransactionDate(date: string) {
    const parsedDate = new Date(date);

    return parsedDate.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function loadAdvancedReport(
    selectedStartDate: string,
    selectedEndDate: string,
  ) {
    setIsAdvancedLoading(true);
    setAdvancedErrorMessage("");

    try {
      const result = await getAdvancedReport(
        selectedStartDate,
        selectedEndDate,
      );

      if (!result.response.ok) {
        if (result.response.status === 403) {
          setAdvancedReport(null);
          setAdvancedErrorMessage(
            "MoneyFlow Pro is required for advanced reports.",
          );
          return;
        }

        throw new Error(
          result.data.message || "Unable to load advanced report",
        );
      }

      setAdvancedReport(result.data.report);
    } catch (error) {
      console.error("Loading advanced report failed:", error);

      setAdvancedReport(null);

      setAdvancedErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load advanced report",
      );
    } finally {
      setIsAdvancedLoading(false);
    }
  }

  async function loadReport(
    selectedStartDate: string,
    selectedEndDate: string,
  ) {
    setIsLoading(true);
    setErrorMessage("");

    setAdvancedReport(null);
    setAdvancedErrorMessage("");
    setIsAdvancedLoading(true);

    try {
      const result = await getReport(selectedStartDate, selectedEndDate);

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to load report");
      }

      setReport(result.data.report);

      setExpandedCategories({});

      await loadAdvancedReport(selectedStartDate, selectedEndDate);
    } catch (error) {
      console.error("Loading report failed:", error);

      setReport(null);
      setAdvancedReport(null);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load report",
      );

      setIsAdvancedLoading(false);
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

  useEffect(() => {
    async function loadSubscription() {
      try {
        const response = await getSubscription();

        if (response.response.ok) {
          setSubscription(response.data.subscription);
        }
      } catch (error) {
        console.error("Loading subscription failed:", error);
      }
    }

    loadSubscription();
  }, []);

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

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
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

  const breakdownByParent = useMemo(() => {
    if (!report) {
      return new Map<string, Report["spendingBreakdown"]>();
    }

    const groups = new Map<string, Report["spendingBreakdown"]>();

    for (const item of report.spendingBreakdown) {
      const existing = groups.get(item.parentCategoryId) || [];

      existing.push(item);

      groups.set(item.parentCategoryId, existing);
    }

    return groups;
  }, [report]);

  const topSpendingTotal = useMemo(() => {
    if (!advancedReport) {
      return 0;
    }

    return advancedReport.topSpendingTransactions.reduce(
      (total, transaction) => total + Number(transaction.amountMinor),
      0,
    );
  }, [advancedReport]);

  const visualSpendingBreakdown = useMemo(() => {
    if (!advancedReport) {
      return [];
    }

    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        totalMinor: number;
      }
    >();

    for (const item of advancedReport.spendingBreakdown) {
      const key = item.parentCategoryId || item.categoryId;

      const existing = groups.get(key);

      if (existing) {
        existing.totalMinor += Number(item.totalMinor);
      } else {
        groups.set(key, {
          id: key,
          name: item.parentCategoryName || item.categoryName,
          totalMinor: Number(item.totalMinor),
        });
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.totalMinor - a.totalMinor)
      .map((item) => ({
        ...item,
        percentage:
          totalSpending > 0 ? (item.totalMinor / totalSpending) * 100 : 0,
      }));
  }, [advancedReport, totalSpending]);

  const donutGradient = useMemo(() => {
    if (visualSpendingBreakdown.length === 0) {
      return "conic-gradient(#e2e8f0 0% 100%)";
    }

    const chartClasses = [
      "#0f172a",
      "#475569",
      "#64748b",
      "#94a3b8",
      "#cbd5e1",
      "#334155",
      "#1e293b",
    ];

    let currentPercentage = 0;

    const sections = visualSpendingBreakdown.map((item, index) => {
      const start = currentPercentage;
      const end = currentPercentage + item.percentage;

      currentPercentage = end;

      return `${chartClasses[index % chartClasses.length]} ${start}% ${end}%`;
    });

    return `conic-gradient(${sections.join(", ")})`;
  }, [visualSpendingBreakdown]);

  const incomeExpensePercentages = useMemo(() => {
    if (!advancedReport) {
      return {
        income: 0,
        expenses: 0,
      };
    }

    const income = Number(advancedReport.summary.totalIncomeMinor);
    const expenses = Number(advancedReport.summary.totalExpenseMinor);

    const total = income + expenses;

    if (total <= 0) {
      return {
        income: 0,
        expenses: 0,
      };
    }

    return {
      income: (income / total) * 100,
      expenses: (expenses / total) * 100,
    };
  }, [advancedReport]);

  const isPro =
    subscription?.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "cancelled");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
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

      {/* Tab switcher */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <button
          type="button"
          onClick={() => setActiveTab("basic")}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
            activeTab === "basic"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          Basic
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("advanced")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:flex-none ${
            activeTab === "advanced"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Crown size={16} />
          Advanced
          {!isPro && <Lock size={14} />}
        </button>
      </div>

      {/* Period selector */}
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

      {/* Tab content */}
      {activeTab === "basic" ? (
        <>
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
                    <p className="text-sm font-medium text-slate-500">
                      Expenses
                    </p>

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
                  <div className="mt-6 space-y-4">
                    {report.spendingByCategory.map((category) => {
                      const percentage =
                        totalSpending > 0
                          ? (Number(category.totalMinor) / totalSpending) * 100
                          : 0;

                      const breakdown =
                        breakdownByParent.get(category.categoryId) || [];

                      const hasBreakdown = breakdown.length > 0;

                      const isExpanded =
                        expandedCategories[category.categoryId] ?? false;

                      return (
                        <div
                          key={category.categoryId}
                          className="rounded-xl border border-slate-100 bg-white"
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              {hasBreakdown ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleCategory(category.categoryId)
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                                  aria-label={
                                    isExpanded
                                      ? `Collapse ${category.categoryName}`
                                      : `Expand ${category.categoryName}`
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={18} />
                                  ) : (
                                    <ChevronRight size={18} />
                                  )}
                                </button>
                              ) : (
                                <div className="h-8 w-8 shrink-0" />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {category.categoryName}
                                    </p>

                                    {hasBreakdown && (
                                      <p className="text-xs text-slate-500">
                                        {breakdown.length === 1
                                          ? "1 category"
                                          : `${breakdown.length} categories`}
                                      </p>
                                    )}
                                  </div>

                                  <div className="text-left sm:text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {formatMoney(Number(category.totalMinor))}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {percentage.toFixed(0)}%
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className="h-full rounded-full bg-slate-900 transition-all"
                                    style={{
                                      width: `${Math.min(percentage, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {isExpanded && hasBreakdown && (
                            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                              <div className="ml-11 space-y-3">
                                {breakdown.map((item) => {
                                  const itemPercentage =
                                    Number(category.totalMinor) > 0
                                      ? (Number(item.totalMinor) /
                                          Number(category.totalMinor)) *
                                        100
                                      : 0;

                                  const isSubcategory = item.parentId !== null;

                                  return (
                                    <div
                                      key={item.categoryId}
                                      className="flex items-center justify-between gap-4"
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-400">
                                            ↳
                                          </span>

                                          <p
                                            className={`truncate text-sm ${
                                              isSubcategory
                                                ? "text-slate-600"
                                                : "font-medium text-slate-700"
                                            }`}
                                          >
                                            {item.categoryName}
                                          </p>
                                        </div>

                                        <div className="ml-5 mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-200 sm:w-48">
                                          <div
                                            className="h-full rounded-full bg-slate-400"
                                            style={{
                                              width: `${Math.min(
                                                itemPercentage,
                                                100,
                                              )}%`,
                                            }}
                                          />
                                        </div>
                                      </div>

                                      <div className="shrink-0 text-right">
                                        <p className="text-sm font-medium text-slate-800">
                                          {formatMoney(Number(item.totalMinor))}
                                        </p>

                                        <p className="text-xs text-slate-500">
                                          {itemPercentage.toFixed(0)}%
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* MoneyFlow Pro */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-slate-900 p-2">
                        <Crown size={18} className="text-white" />
                      </div>

                      <h2 className="text-lg font-semibold text-slate-900">
                        MoneyFlow Pro
                      </h2>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Go deeper into your spending with advanced financial
                      analysis.
                    </p>
                  </div>

                  {!advancedReport &&
                    advancedErrorMessage.includes(
                      "MoneyFlow Pro is required",
                    ) && (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                        <Lock size={16} />
                        Pro feature
                      </div>
                    )}
                </div>

                {isAdvancedLoading ? (
                  <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-500">
                      Loading advanced report...
                    </p>
                  </div>
                ) : advancedReport ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Pro income
                        </p>

                        <p className="mt-2 text-xl font-bold text-slate-900">
                          {formatMoney(advancedReport.summary.totalIncomeMinor)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Pro expenses
                        </p>

                        <p className="mt-2 text-xl font-bold text-slate-900">
                          {formatMoney(
                            advancedReport.summary.totalExpenseMinor,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Net balance
                        </p>

                        <p
                          className={`mt-2 text-xl font-bold ${
                            advancedReport.summary.totalBalanceMinor >= 0
                              ? "text-slate-900"
                              : "text-red-600"
                          }`}
                        >
                          {formatMoney(
                            advancedReport.summary.totalBalanceMinor,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-5 sm:p-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Where your money went
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          A visual breakdown of how your spending was
                          distributed during this period.
                        </p>
                      </div>

                      {visualSpendingBreakdown.length === 0 ? (
                        <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
                          <p className="text-sm text-slate-500">
                            No spending data available for this period.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr] lg:items-center">
                          <div className="flex justify-center">
                            <div
                              className="relative flex h-64 w-64 items-center justify-center rounded-full sm:h-72 sm:w-72"
                              style={{
                                background: donutGradient,
                              }}
                              aria-label="Spending distribution chart"
                            >
                              <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm sm:h-44 sm:w-44">
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                  Total spent
                                </p>

                                <p className="mt-2 px-3 text-lg font-bold text-slate-900 sm:text-xl">
                                  {formatMoney(
                                    advancedReport.summary.totalExpenseMinor,
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {visualSpendingBreakdown.length} categories
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {visualSpendingBreakdown.map((item, index) => {
                              const chartClasses = [
                                "bg-slate-900",
                                "bg-slate-600",
                                "bg-slate-500",
                                "bg-slate-400",
                                "bg-slate-300",
                                "bg-slate-700",
                                "bg-slate-800",
                              ];

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span
                                      className={`h-3 w-3 shrink-0 rounded-full ${
                                        chartClasses[
                                          index % chartClasses.length
                                        ]
                                      }`}
                                    />

                                    <p className="truncate text-sm font-medium text-slate-800">
                                      {item.name}
                                    </p>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                      {formatMoney(item.totalMinor)}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                      {item.percentage.toFixed(0)}%
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-100 p-5 sm:p-6">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          Income vs expenses
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          See how much money came in compared with how much went
                          out.
                        </p>
                      </div>

                      <div className="mt-6">
                        <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-slate-900 transition-all"
                            style={{
                              width: `${incomeExpensePercentages.income}%`,
                            }}
                          />

                          <div
                            className="h-full bg-slate-300 transition-all"
                            style={{
                              width: `${incomeExpensePercentages.expenses}%`,
                            }}
                          />
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-slate-900" />

                              <p className="text-sm font-medium text-slate-600">
                                Income
                              </p>
                            </div>

                            <p className="mt-2 text-lg font-bold text-slate-900">
                              {formatMoney(
                                advancedReport.summary.totalIncomeMinor,
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-4">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-slate-300" />

                              <p className="text-sm font-medium text-slate-600">
                                Expenses
                              </p>
                            </div>

                            <p className="mt-2 text-lg font-bold text-slate-900">
                              {formatMoney(
                                advancedReport.summary.totalExpenseMinor,
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <div className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              Top spending
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Your largest expenses in this period.
                            </p>
                          </div>

                          <BarChart3
                            size={18}
                            className="shrink-0 text-slate-400"
                          />
                        </div>

                        {advancedReport.topSpendingTransactions.length === 0 ? (
                          <p className="mt-5 text-sm text-slate-500">
                            No expenses recorded.
                          </p>
                        ) : (
                          <div className="mt-5 space-y-3">
                            {advancedReport.topSpendingTransactions.map(
                              (transaction) => {
                                const percentage =
                                  topSpendingTotal > 0
                                    ? (Number(transaction.amountMinor) /
                                        topSpendingTotal) *
                                      100
                                    : 0;

                                return (
                                  <div
                                    key={transaction.id}
                                    className="rounded-lg bg-slate-50 p-3"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">
                                          {transaction.description}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          {transaction.parentCategoryName
                                            ? `${transaction.categoryName} · ${transaction.parentCategoryName}`
                                            : transaction.categoryName}
                                          {" · "}
                                          {formatTransactionDate(
                                            transaction.transactionDate,
                                          )}
                                        </p>
                                      </div>

                                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                                        {formatMoney(
                                          Number(transaction.amountMinor),
                                        )}
                                      </p>
                                    </div>

                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className="h-full rounded-full bg-slate-900"
                                        style={{
                                          width: `${Math.min(percentage, 100)}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-100 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              Budget performance
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              See how your spending compares with your budgets.
                            </p>
                          </div>

                          <TrendingDown
                            size={18}
                            className="shrink-0 text-slate-400"
                          />
                        </div>

                        {advancedReport.budgetPerformance.length === 0 ? (
                          <p className="mt-5 text-sm text-slate-500">
                            No budgets found for this period.
                          </p>
                        ) : (
                          <div className="mt-5 space-y-4">
                            {advancedReport.budgetPerformance.map((budget) => {
                              const isOverBudget =
                                budget.spentMinor > budget.budgetMinor;

                              return (
                                <div
                                  key={budget.id}
                                  className="rounded-lg bg-slate-50 p-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-800">
                                        {budget.categoryName}
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        {formatMoney(Number(budget.spentMinor))}{" "}
                                        spent of{" "}
                                        {formatMoney(
                                          Number(budget.budgetMinor),
                                        )}
                                      </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <p
                                        className={`text-sm font-semibold ${
                                          isOverBudget
                                            ? "text-red-600"
                                            : "text-slate-900"
                                        }`}
                                      >
                                        {Number(budget.percentageUsed).toFixed(
                                          0,
                                        )}
                                        %
                                      </p>

                                      <p className="text-xs text-slate-500">
                                        {isOverBudget
                                          ? "Over budget"
                                          : "Within budget"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                      className={`h-full rounded-full ${
                                        isOverBudget
                                          ? "bg-red-500"
                                          : "bg-slate-900"
                                      }`}
                                      style={{
                                        width: `${Math.min(
                                          Number(budget.percentageUsed),
                                          100,
                                        )}%`,
                                      }}
                                    />
                                  </div>

                                  <p
                                    className={`mt-2 text-xs ${
                                      isOverBudget
                                        ? "text-red-600"
                                        : "text-slate-500"
                                    }`}
                                  >
                                    {isOverBudget
                                      ? `${formatMoney(
                                          Math.abs(
                                            Number(budget.remainingMinor),
                                          ),
                                        )} over budget`
                                      : `${formatMoney(
                                          Number(budget.remainingMinor),
                                        )} remaining`}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900">
                          <Lock size={19} className="text-white" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Unlock deeper financial insights
                          </h3>

                          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                            MoneyFlow Pro gives you detailed spending analysis,
                            top spending activity, and budget performance for
                            the selected period.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/app/pro")}
                        className="w-full shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                      >
                        Explore Pro
                      </button>
                    </div>

                    {advancedErrorMessage &&
                      !advancedErrorMessage.includes(
                        "MoneyFlow Pro is required",
                      ) && (
                        <p className="mt-4 text-sm text-red-600">
                          {advancedErrorMessage}
                        </p>
                      )}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      ) : (
        <>
          {isPro ? (
            <AdvancedReportsTab
              startDate={startDate}
              endDate={endDate}
              currencySymbol={currencySymbol}
            />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
                  <Crown size={28} className="text-amber-700" />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Advanced analytics is a Pro feature
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Upgrade to MoneyFlow Pro to see detailed charts, category
                  breakdowns, your largest transactions, and downloadable
                  reports.
                </p>

                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="button"
                    onClick={() => navigate("/app/pro")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                  >
                    <Crown size={16} />
                    Upgrade to Pro
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("basic")}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Back to basic report
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
