import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Download, FileText, RefreshCw } from "lucide-react";

import {
  getAdvancedAnalytics,
  type AdvancedAnalytics,
} from "../api/advancedReports.js";

type AdvancedReportsTabProps = {
  startDate: string;
  endDate: string;
  currencySymbol: string;
};

const DONUT_COLORS = [
  "#0f172a",
  "#1e293b",
  "#334155",
  "#475569",
  "#64748b",
  "#94a3b8",
  "#cbd5e1",
  "#e2e8f0",
  "#f1f5f9",
];

function formatMoney(amountMinor: number, currencySymbol: string) {
  return `${currencySymbol}${(Number(amountMinor) / 100).toLocaleString(
    "en-NG",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatBucketLabel(bucket: string, mode: "day" | "week") {
  const date = new Date(`${bucket}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return bucket;
  }

  if (mode === "week") {
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
    });
  }

  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
  });
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdvancedReportsTab({
  startDate,
  endDate,
  currencySymbol,
}: AdvancedReportsTabProps) {
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadAnalytics() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getAdvancedAnalytics(startDate, endDate);

      if (!response.response.ok) {
        throw new Error(
          response.data.message || "Unable to load advanced analytics",
        );
      }

      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error("Loading advanced analytics failed:", error);

      setAnalytics(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load advanced analytics",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate]);

  const donutData = useMemo(() => {
    if (!analytics) return [];

    return analytics.categoryDonut.map((row, index) => ({
      name: row.categoryName,
      value: row.totalMinor,
      percentage: row.percentage,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
  }, [analytics]);

  const timeSeriesData = useMemo(() => {
    if (!analytics) return [];

    return analytics.timeSeries.map((point) => ({
      label: formatBucketLabel(point.bucket, analytics.bucket),
      income: point.incomeMinor / 100,
      expense: point.expenseMinor / 100,
    }));
  }, [analytics]);

  function handleExportCategories() {
    if (!analytics) return;

    const rows: string[][] = [
      ["Category", "Amount", "Percentage"],
      ...analytics.topCategories.map((row) => [
        row.categoryName,
        (row.totalMinor / 100).toFixed(2),
        row.percentage.toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-categories-${startDate}_${endDate}.csv`, rows);
  }

  function handleExportSubCategories() {
    if (!analytics) return;

    const rows: string[][] = [
      ["Subcategory", "Parent category", "Amount", "Percentage"],
      ...analytics.topSubCategories.map((row) => [
        row.categoryName,
        row.parentCategoryName,
        (row.totalMinor / 100).toFixed(2),
        row.percentage.toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-subcategories-${startDate}_${endDate}.csv`, rows);
  }

  function handleExportTimeSeries() {
    if (!analytics) return;

    const rows: string[][] = [
      ["Period", "Income", "Expense"],
      ...analytics.timeSeries.map((row) => [
        row.bucket,
        (row.incomeMinor / 100).toFixed(2),
        (row.expenseMinor / 100).toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-timeline-${startDate}_${endDate}.csv`, rows);
  }

  function handleExportTransactions() {
    if (!analytics) return;

    const rows: string[][] = [
      ["Date", "Description", "Category", "Parent category", "Amount"],
      ...analytics.topTransactions.map((row) => [
        row.transactionDate.slice(0, 10),
        row.description,
        row.categoryName,
        row.parentCategoryName ?? "",
        (row.amountMinor / 100).toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-transactions-${startDate}_${endDate}.csv`, rows);
  }

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm text-slate-500">Loading advanced analytics...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-red-600" />

          <div className="flex-1">
            <p className="font-semibold text-red-900">
              Unable to load advanced analytics
            </p>

            <p className="mt-1 text-sm text-red-800">{errorMessage}</p>

            <button
              type="button"
              onClick={loadAnalytics}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={16} />
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!analytics || analytics.topCategories.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p className="text-sm font-medium text-slate-700">
          No data for this period
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Add some transactions and the analytics will appear here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FileText size={16} />
          Save as PDF
        </button>
      </div>

      {/* Top categories */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Top categories
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Where most of your money went.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCategories}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
          >
            <Download size={14} />
            CSV
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {analytics.topCategories.map((row) => (
            <div key={row.categoryId}>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-800">
                  {row.categoryName}
                </p>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMoney(row.totalMinor, currencySymbol)}
                  </p>

                  <p className="text-xs text-slate-500">
                    {row.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${Math.min(row.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Subcategories */}
      {analytics.topSubCategories.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Top subcategories
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                The finer detail behind your categories.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportSubCategories}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
            >
              <Download size={14} />
              CSV
            </button>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Subcategory</th>
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Share</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {analytics.topSubCategories.map((row) => (
                  <tr key={row.categoryId}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.categoryName}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {row.parentCategoryName}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(row.totalMinor, currencySymbol)}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-500">
                      {row.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Donut + income vs expense */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Spending split
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              How your expenses divide across categories.
            </p>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? formatMoney(value, currencySymbol)
                      : ""
                  }
                />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Income vs expenses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              See how much came in versus how much went out.
            </p>
          </div>

          <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{
                width: `${analytics.incomeVsExpense.incomePercentage}%`,
              }}
            />

            <div
              className="h-full bg-slate-300 transition-all"
              style={{
                width: `${analytics.incomeVsExpense.expensePercentage}%`,
              }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-900" />

                <p className="text-sm font-medium text-slate-600">Income</p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(
                  analytics.incomeVsExpense.totalIncomeMinor,
                  currencySymbol,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {analytics.incomeVsExpense.incomePercentage.toFixed(1)}% of
                total flow
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-slate-300" />

                <p className="text-sm font-medium text-slate-600">Expenses</p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(
                  analytics.incomeVsExpense.totalExpenseMinor,
                  currencySymbol,
                )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {analytics.incomeVsExpense.expensePercentage.toFixed(1)}% of
                total flow
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Timeline */}
      {timeSeriesData.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>

              <p className="mt-1 text-sm text-slate-500">
                {analytics.bucket === "day"
                  ? "Daily income and spending for the selected period."
                  : "Weekly income and spending for the selected period."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportTimeSeries}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
            >
              <Download size={14} />
              CSV
            </button>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number"
                      ? `${currencySymbol}${value.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`
                      : ""
                  }
                />
                <Legend />
                <Bar dataKey="income" fill="#0f172a" name="Income" />
                <Bar dataKey="expense" fill="#94a3b8" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Top transactions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Largest transactions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              The biggest single expenses in this period.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportTransactions}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 print:hidden"
          >
            <Download size={14} />
            CSV
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {analytics.topTransactions.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {new Date(row.transactionDate).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>

                  <td className="px-4 py-3 text-slate-800">
                    {row.description}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {row.parentCategoryName
                      ? `${row.parentCategoryName} · ${row.categoryName}`
                      : row.categoryName}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(row.amountMinor, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
