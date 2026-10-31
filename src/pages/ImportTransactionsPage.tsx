import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import Papa from "papaparse";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "react-router";

import { getCategories, type Category } from "../api/categories.js";
import { importTransactions, suggestCategories } from "../api/transactions.js";
import { getProAccess } from "../api/subscription.js";
import { useAuth } from "../context/AuthContext.js";
import { categoryLabel } from "../i18n/categories.js";
import { formatDate, formatMoney } from "../i18n/format.js";
import {
  DATE_FORMATS,
  detectDateFormat,
  guessColumns,
  parseAmount,
  parseDate,
  type DateFormat,
} from "../utils/csvImport.js";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1000;
const MAX_DESCRIPTION_LENGTH = 160;

type Step = "upload" | "map" | "review" | "done";
type AmountMode = "single" | "split";

type ReviewRow = {
  include: boolean;
  date: string | null;
  description: string;
  amount: number | null;
  type: "income" | "expense";
  categoryId: string;
};

const SAMPLE_CSV =
  "Date,Description,Amount\n2026-10-01,Salary,250000\n2026-10-02,Groceries,-18500\n2026-10-03,Transport,-7000\n";

export default function ImportTransactionsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();
  const currencyCode = onboardingPreferences?.currency_code || "NGN";
  // Only a tie-breaker for dates like 05/06/2026 (see detectDateFormat).
  const prefersMonthFirst =
    currencyCode === "USD" && navigator.language === "en-US";
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [dateColumn, setDateColumn] = useState("");
  const [descriptionColumn, setDescriptionColumn] = useState("");
  const [amountMode, setAmountMode] = useState<AmountMode>("single");
  const [amountColumn, setAmountColumn] = useState("");
  const [debitColumn, setDebitColumn] = useState("");
  const [creditColumn, setCreditColumn] = useState("");
  const [dateFormat, setDateFormat] = useState<DateFormat>("YMD");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [incomeCategoryId, setIncomeCategoryId] = useState("");

  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [preparing, setPreparing] = useState(false);
  // How many rows Pro auto-categorisation filled in (null = not run).
  const [autoCategorized, setAutoCategorized] = useState<number | null>(null);
  const [result, setResult] = useState<{
    importedCount: number;
    skippedCount: number;
  } | null>(null);

  useEffect(() => {
    getProAccess()
      .then(setIsPro)
      .catch(() => setIsPro(false));
  }, []);

  useEffect(() => {
    getCategories()
      .then((response) => {
        const loaded: Category[] = response.data.categories;
        setCategories(loaded);

        const fallback = (kind: Category["kind"]) =>
          loaded.find(
            (category) =>
              category.kind === kind &&
              category.parent_id === null &&
              category.name === "Other",
          ) ?? loaded.find((category) => category.kind === kind);

        setExpenseCategoryId(fallback("expense")?.id ?? "");
        setIncomeCategoryId(fallback("income")?.id ?? "");
      })
      .catch(() => setError(t("transactions.categoriesFailed")));
  }, [t]);

  const expenseCategories = categories.filter(
    (category) => category.kind === "expense",
  );
  const incomeCategories = categories.filter(
    (category) => category.kind === "income",
  );

  function categoryOptions(list: Category[]) {
    return list.map((category) => (
      <option key={category.id} value={category.id}>
        {category.parent_id
          ? `— ${categoryLabel(category.name)}`
          : categoryLabel(category.name)}
      </option>
    ));
  }

  function reset() {
    setStep("upload");
    setError("");
    setFileName("");
    setHeaders([]);
    setRecords([]);
    setRows([]);
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError(t("import.errors.tooLarge"));
      return;
    }

    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError(t("import.errors.notCsv"));
      return;
    }

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (parsed) => {
        const fields = (parsed.meta.fields ?? []).filter(Boolean);
        const data = parsed.data.filter((row) =>
          Object.values(row).some((value) => String(value ?? "").trim()),
        );

        if (fields.length < 2 || data.length === 0) {
          setError(t("import.errors.empty"));
          return;
        }

        if (data.length > MAX_ROWS) {
          setError(t("import.errors.tooManyRows", { max: MAX_ROWS }));
          return;
        }

        const guess = guessColumns(fields);

        setFileName(file.name);
        setHeaders(fields);
        setRecords(data);
        setDateColumn(guess.date || fields[0]);
        setDescriptionColumn(guess.description || fields[1] || "");

        if (!guess.amount && guess.debit && guess.credit) {
          setAmountMode("split");
        } else {
          setAmountMode("single");
        }

        setAmountColumn(guess.amount || fields[2] || "");
        setDebitColumn(guess.debit);
        setCreditColumn(guess.credit);
        setDateFormat(
          detectDateFormat(
            data.map((row) => row[guess.date || fields[0]] ?? ""),
            prefersMonthFirst,
          ),
        );
        setStep("map");
      },
      error: () => setError(t("import.errors.unreadable")),
    });
  }

  async function buildRows() {
    setError("");
    setAutoCategorized(null);

    const built: ReviewRow[] = records.map((record) => {
      let amount: number | null;

      if (amountMode === "single") {
        amount = parseAmount(record[amountColumn]);
      } else {
        const debit = parseAmount(record[debitColumn]) ?? 0;
        const credit = parseAmount(record[creditColumn]) ?? 0;
        amount = credit !== 0 || debit !== 0 ? Math.abs(credit) - Math.abs(debit) : null;
      }

      const type: ReviewRow["type"] = (amount ?? 0) >= 0 ? "income" : "expense";
      const date = parseDate(record[dateColumn], dateFormat);
      const description = String(record[descriptionColumn] ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, MAX_DESCRIPTION_LENGTH);

      return {
        include: date !== null && amount !== null && amount !== 0 && description !== "",
        date,
        description,
        amount: amount === null ? null : Math.abs(amount),
        type,
        categoryId: type === "income" ? incomeCategoryId : expenseCategoryId,
      };
    });

    if (!built.some((row) => row.include)) {
      setError(t("import.errors.noValidRows"));
      return;
    }

    if (isPro) {
      setPreparing(true);

      try {
        const suggestions = await suggestCategories(
          built.map((row) => ({
            description: row.description,
            type: row.type,
          })),
        );

        let filled = 0;

        suggestions.forEach((categoryId, index) => {
          if (categoryId && categories.some((category) => category.id === categoryId)) {
            built[index].categoryId = categoryId;
            filled += 1;
          }
        });

        setAutoCategorized(filled);
      } catch {
        // Suggestions are a convenience; the defaults still work.
        setAutoCategorized(null);
      } finally {
        setPreparing(false);
      }
    }

    setRows(built);
    setStep("review");
  }

  function updateRow(index: number, changes: Partial<ReviewRow>) {
    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) {
          return row;
        }

        const next = { ...row, ...changes };

        // Switching income/expense needs a category of that kind.
        if (changes.type && changes.type !== row.type) {
          next.categoryId =
            changes.type === "income" ? incomeCategoryId : expenseCategoryId;
        }

        return next;
      }),
    );
  }

  const isRowValid = (row: ReviewRow) =>
    row.date !== null &&
    row.amount !== null &&
    row.amount > 0 &&
    row.description !== "" &&
    row.categoryId !== "";

  const selectedRows = rows.filter((row) => row.include && isRowValid(row));

  const totals = useMemo(
    () =>
      selectedRows.reduce(
        (sum, row) => {
          sum[row.type] += Math.round((row.amount ?? 0) * 100);
          return sum;
        },
        { income: 0, expense: 0 },
      ),
    [selectedRows],
  );

  async function handleImport() {
    setError("");
    setImporting(true);

    try {
      const response = await importTransactions(
        selectedRows.map((row) => ({
          categoryId: row.categoryId,
          type: row.type,
          amount: row.amount ?? 0,
          description: row.description,
          transactionDate: row.date ?? "",
        })),
        skipDuplicates,
      );

      setResult({
        importedCount: response.data.importedCount,
        skippedCount: response.data.skippedCount,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("import.errors.failed"));
    } finally {
      setImporting(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "moneyflow-import-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const selectClass =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

  const columnSelect = (
    value: string,
    onChange: (value: string) => void,
    allowNone = false,
  ) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={selectClass}
    >
      {allowNone && <option value="">{t("import.map.none")}</option>}
      {headers.map((header) => (
        <option key={header} value={header}>
          {header}
        </option>
      ))}
    </select>
  );

  const preview = records.slice(0, 3);

  // Shown next to the date format so a wrong guess is easy to spot.
  const detectedRange = useMemo(() => {
    const dates = records
      .map((record) => parseDate(record[dateColumn], dateFormat))
      .filter((date): date is string => date !== null)
      .sort();

    return dates.length > 0
      ? { from: dates[0], to: dates[dates.length - 1] }
      : null;
  }, [records, dateColumn, dateFormat]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/transactions")}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">{t("transactions.eyebrow")}</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t("transactions.import")}
          </h1>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs font-medium">
        {(["upload", "map", "review"] as const).map((name, index) => (
          <li
            key={name}
            className={`rounded-full px-3 py-1 ${
              step === name || (step === "done" && name === "review")
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {index + 1}. {t(`import.steps.${name}`)}
          </li>
        ))}
      </ol>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {step === "upload" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-6 py-12 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40">
            <FileSpreadsheet size={36} className="text-emerald-600" />

            <span className="mt-4 font-semibold text-slate-900">
              {t("import.upload.title")}
            </span>

            <span className="mt-1 max-w-md text-sm text-slate-500">
              {t("import.upload.body")}
            </span>

            <span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
              <Upload size={16} />
              {t("import.upload.choose")}
            </span>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.txt"
              onChange={handleFile}
              className="sr-only"
            />
          </label>

          <div className="mt-5 flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>{t("import.upload.howTo")}</p>

            <button
              type="button"
              onClick={downloadSample}
              className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:underline"
            >
              <Download size={16} />
              {t("import.upload.sample")}
            </button>
          </div>
        </section>
      )}

      {step === "map" && (
        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              {t("import.map.title")}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {t("import.map.body", { file: fileName, count: records.length })}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t("common.date")}</span>
              {columnSelect(dateColumn, (value) => {
                setDateColumn(value);
                setDateFormat(
                  detectDateFormat(
                    records.map((row) => row[value] ?? ""),
                    prefersMonthFirst,
                  ),
                );
              })}
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t("import.map.dateFormat")}</span>
              <select
                value={dateFormat}
                onChange={(event) => setDateFormat(event.target.value as DateFormat)}
                className={selectClass}
              >
                {DATE_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {t(`import.map.formats.${format}`)}
                  </option>
                ))}
              </select>

              <span className="block text-xs font-normal text-slate-500">
                {detectedRange
                  ? t("import.map.dateRange", {
                      from: formatDate(detectedRange.from),
                      to: formatDate(detectedRange.to),
                    })
                  : t("import.map.noDates")}
              </span>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
              <span>{t("common.description")}</span>
              {columnSelect(descriptionColumn, setDescriptionColumn)}
            </label>

            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium text-slate-700">
                {t("import.map.amountLayout")}
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {(["single", "split"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm ${
                      amountMode === mode
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="amount-mode"
                      checked={amountMode === mode}
                      onChange={() => setAmountMode(mode)}
                      className="mt-1 accent-emerald-600"
                    />
                    <span>
                      <span className="block font-medium text-slate-900">
                        {t(`import.map.${mode}`)}
                      </span>
                      <span className="text-slate-500">
                        {t(`import.map.${mode}Hint`)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {amountMode === "single" ? (
              <label className="space-y-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                <span>{t("common.amount")}</span>
                {columnSelect(amountColumn, setAmountColumn)}
              </label>
            ) : (
              <>
                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>{t("import.map.moneyOut")}</span>
                  {columnSelect(debitColumn, setDebitColumn, true)}
                </label>

                <label className="space-y-1.5 text-sm font-medium text-slate-700">
                  <span>{t("import.map.moneyIn")}</span>
                  {columnSelect(creditColumn, setCreditColumn, true)}
                </label>
              </>
            )}

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t("import.map.expenseCategory")}</span>
              <select
                value={expenseCategoryId}
                onChange={(event) => setExpenseCategoryId(event.target.value)}
                className={selectClass}
              >
                {categoryOptions(expenseCategories)}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>{t("import.map.incomeCategory")}</span>
              <select
                value={incomeCategoryId}
                onChange={(event) => setIncomeCategoryId(event.target.value)}
                className={selectClass}
              >
                {categoryOptions(incomeCategories)}
              </select>
            </label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <p className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              {t("import.map.fileStart")}
            </p>

            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-2">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((row, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    {headers.map((header) => (
                      <td key={header} className="whitespace-nowrap px-3 py-2 text-slate-700">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("import.chooseAnother")}
            </button>

            <button
              type="button"
              onClick={buildRows}
              disabled={preparing || !dateColumn || !descriptionColumn || !expenseCategoryId || !incomeCategoryId}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {preparing ? t("import.review.sorting") : t("import.map.continue")}
            </button>
          </div>
        </section>
      )}

      {step === "review" && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                {t("import.review.title")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("import.review.summary", {
                  count: selectedRows.length,
                  income: formatMoney(totals.income, currencyCode),
                  expense: formatMoney(totals.expense, currencyCode),
                })}
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(event) => setSkipDuplicates(event.target.checked)}
                className="accent-emerald-600"
              />
              {t("import.review.skipDuplicates")}
            </label>
          </div>

          {isPro ? (
            autoCategorized !== null && (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <Sparkles size={16} className="shrink-0" />
                {t("import.review.autoCategorized", { count: autoCategorized })}
              </p>
            )
          ) : (
            <p className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Sparkles size={16} className="shrink-0 text-emerald-600" />
              {t("import.review.proHint")}
              <Link to="/app/pro" className="font-semibold text-emerald-700 hover:underline">
                {t("pro.upgrade")}
              </Link>
            </p>
          )}

          <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2" />
                  <th className="px-3 py-2">{t("common.date")}</th>
                  <th className="px-3 py-2">{t("common.description")}</th>
                  <th className="px-3 py-2">{t("common.type")}</th>
                  <th className="px-3 py-2">{t("common.category")}</th>
                  <th className="px-3 py-2 text-right">{t("common.amount")}</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const valid = isRowValid(row);

                  return (
                    <tr
                      key={index}
                      className={`border-t border-slate-100 ${
                        !valid ? "bg-red-50/60" : !row.include ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.include && valid}
                          disabled={!valid}
                          onChange={(event) =>
                            updateRow(index, { include: event.target.checked })
                          }
                          aria-label={t("import.review.include")}
                          className="accent-emerald-600"
                        />
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {row.date ? formatDate(row.date) : (
                          <span className="text-red-600">{t("import.review.badDate")}</span>
                        )}
                      </td>

                      <td className="max-w-xs truncate px-3 py-2 text-slate-900" title={row.description}>
                        {row.description || (
                          <span className="text-red-600">{t("import.review.noDescription")}</span>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={row.type}
                          onChange={(event) =>
                            updateRow(index, {
                              type: event.target.value as ReviewRow["type"],
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          <option value="expense">{t("common.expense")}</option>
                          <option value="income">{t("common.income")}</option>
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={row.categoryId}
                          onChange={(event) =>
                            updateRow(index, { categoryId: event.target.value })
                          }
                          className="max-w-44 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                        >
                          {categoryOptions(
                            row.type === "income" ? incomeCategories : expenseCategories,
                          )}
                        </select>
                      </td>

                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-semibold ${
                          row.type === "income" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {row.amount === null ? (
                          <span className="text-red-600">{t("import.review.badAmount")}</span>
                        ) : (
                          `${row.type === "income" ? "+" : "-"}${formatMoney(
                            Math.round(row.amount * 100),
                            currencyCode,
                          )}`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setStep("map")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.back")}
            </button>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedRows.length === 0}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {importing
                ? t("import.review.importing")
                : t("import.review.submit", { count: selectedRows.length })}
            </button>
          </div>
        </section>
      )}

      {step === "done" && result && (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto text-emerald-600" />

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            {t("import.done.title", { count: result.importedCount })}
          </h2>

          {result.skippedCount > 0 && (
            <p className="mt-2 text-sm text-slate-500">
              {t("import.done.skipped", { count: result.skippedCount })}
            </p>
          )}

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("import.done.another")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/app/transactions")}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t("import.done.view")}
            </button>
          </div>
        </section>
      )}

      <p className="text-xs text-slate-400">
        {t("import.privacy")}
      </p>
    </div>
  );
}
