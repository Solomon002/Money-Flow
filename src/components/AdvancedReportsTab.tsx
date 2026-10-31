import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatMoney as formatLocalMoney } from "../i18n/format.js";
import { categoryLabel } from "../i18n/categories.js";
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
  currencyCode: string;
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

function formatMoney(amountMinor: number, currencyCode: string) {
  return formatLocalMoney(amountMinor, currencyCode);
}

function formatBucketLabel(bucket: string) {
  return formatDate(bucket, { day: "numeric", month: "short" }) || bucket;
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
  currencyCode,
}: AdvancedReportsTabProps) {
  const { t } = useTranslation();
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
          response.data.message || t("reports.analyticsFailed"),
        );
      }

      setAnalytics(response.data.analytics);
    } catch (error) {
      console.error("Loading advanced analytics failed:", error);

      setAnalytics(null);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("reports.analyticsFailed"),
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
      name: categoryLabel(row.categoryName),
      value: row.totalMinor,
      percentage: row.percentage,
      color: DONUT_COLORS[index % DONUT_COLORS.length],
    }));
  }, [analytics]);

  const timeSeriesData = useMemo(() => {
    if (!analytics) return [];

    return analytics.timeSeries.map((point) => ({
      label: formatBucketLabel(point.bucket),
      income: point.incomeMinor / 100,
      expense: point.expenseMinor / 100,
    }));
  }, [analytics]);

  function handleExportCategories() {
    if (!analytics) return;

    const rows: string[][] = [
      [t("common.category"), t("common.amount"), t("reports.csv.percentage")],
      ...analytics.topCategories.map((row) => [
        categoryLabel(row.categoryName),
        (row.totalMinor / 100).toFixed(2),
        row.percentage.toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-categories-${startDate}_${endDate}.csv`, rows);
  }

  function handleExportSubCategories() {
    if (!analytics) return;

    const rows: string[][] = [
      [
        t("transactions.form.subcategory"),
        t("reports.csv.parentCategory"),
        t("common.amount"),
        t("reports.csv.percentage"),
      ],
      ...analytics.topSubCategories.map((row) => [
        categoryLabel(row.categoryName),
        categoryLabel(row.parentCategoryName),
        (row.totalMinor / 100).toFixed(2),
        row.percentage.toFixed(2),
      ]),
    ];

    downloadCsv(`moneyflow-subcategories-${startDate}_${endDate}.csv`, rows);
  }

  function handleExportTimeSeries() {
    if (!analytics) return;

    const rows: string[][] = [
      [t("reports.csv.period"), t("common.income"), t("common.expense")],
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
      [
        t("common.date"),
        t("common.description"),
        t("common.category"),
        t("reports.csv.parentCategory"),
        t("common.amount"),
      ],
      ...analytics.topTransactions.map((row) => [
        row.transactionDate.slice(0, 10),
        row.description,
        categoryLabel(row.categoryName),
        row.parentCategoryName ? categoryLabel(row.parentCategoryName) : "",
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
        <p className="text-sm text-slate-500">{t("reports.loadingAnalytics")}</p>
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
              {t("reports.analyticsFailed")}
            </p>

            <p className="mt-1 text-sm text-red-800">{errorMessage}</p>

            <button
              type="button"
              onClick={loadAnalytics}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
            >
              <RefreshCw size={16} />
              {t("common.retry")}
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
          {t("reports.noData")}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {t("reports.noDataBody")}
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
              {t("reports.topCategories")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("reports.topCategoriesBody")}
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
                  {categoryLabel(row.categoryName)}
                </p>

                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatMoney(row.totalMinor, currencyCode)}
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
                {t("reports.topSubcategories")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("reports.topSubcategoriesBody")}
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
                  <th className="px-4 py-3">{t("transactions.form.subcategory")}</th>
                  <th className="px-4 py-3">{t("reports.parent")}</th>
                  <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                  <th className="px-4 py-3 text-right">{t("reports.share")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {analytics.topSubCategories.map((row) => (
                  <tr key={row.categoryId}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {categoryLabel(row.categoryName)}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {categoryLabel(row.parentCategoryName)}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(row.totalMinor, currencyCode)}
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
              {t("reports.spendingSplit")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("reports.spendingSplitBody")}
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
                      ? formatMoney(value, currencyCode)
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
              {t("reports.incomeVsExpenses")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("reports.incomeVsExpensesShort")}
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

                <p className="text-sm font-medium text-slate-600">{t("common.income")}</p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(
                  analytics.incomeVsExpense.totalIncomeMinor,
                  currencyCode,
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

                <p className="text-sm font-medium text-slate-600">{t("common.expenses")}</p>
              </div>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatMoney(
                  analytics.incomeVsExpense.totalExpenseMinor,
                  currencyCode,
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
              <h2 className="text-lg font-semibold text-slate-900">{t("reports.timeline")}</h2>

              <p className="mt-1 text-sm text-slate-500">
                {analytics.bucket === "day"
                  ? t("reports.timelineDaily")
                  : t("reports.timelineWeekly")}
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
                      ? formatMoney(value * 100, currencyCode)
                      : ""
                  }
                />
                <Legend />
                <Bar dataKey="income" fill="#0f172a" name={t("common.income")} />
                <Bar dataKey="expense" fill="#94a3b8" name={t("common.expenses")} />
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
              {t("reports.largestTransactions")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("reports.largestTransactionsBody")}
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
                <th className="px-4 py-3">{t("common.date")}</th>
                <th className="px-4 py-3">{t("common.description")}</th>
                <th className="px-4 py-3">{t("common.category")}</th>
                <th className="px-4 py-3 text-right">{t("common.amount")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {analytics.topTransactions.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatDate(row.transactionDate)}
                  </td>

                  <td className="px-4 py-3 text-slate-800">
                    {row.description}
                  </td>

                  <td className="px-4 py-3 text-slate-500">
                    {row.parentCategoryName
                      ? `${categoryLabel(row.parentCategoryName)} · ${categoryLabel(row.categoryName)}`
                      : categoryLabel(row.categoryName)}
                  </td>

                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(row.amountMinor, currencyCode)}
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
