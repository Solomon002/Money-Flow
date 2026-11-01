import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Plus,
  Upload,
} from "lucide-react";
import { getTransactions, type Transaction } from "../api/transactions.js";
import { useAuth } from "../context/AuthContext.js";
import { formatDate as formatLocalDate, formatMoney } from "../i18n/format.js";
import { categoryLabel } from "../i18n/categories.js";

export default function TransactionsPage() {
  const { onboardingPreferences } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const currencyCode = onboardingPreferences?.currency_code || "NGN";

  useEffect(() => {
    async function loadTransactions() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getTransactions();

        if (!result.response.ok) {
          throw new Error(result.data.message || t("transactions.loadFailed"));
        }

        setTransactions(result.data.transactions);
      } catch (error) {
        console.error("Loading transactions failed:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : t("transactions.loadFailed"),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, []);

  function formatAmount(amountMinor: number) {
    return formatMoney(amountMinor, currencyCode);
  }

  function formatDate(dateString: string) {
    return formatLocalDate(dateString) || t("common.unknownDate");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">{t("transactions.eyebrow")}</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t("transactions.title")}
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {t("transactions.subtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/app/transactions/import")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Upload size={18} />
            {t("transactions.import")}
          </button>

          <button
            type="button"
            onClick={() => navigate("/app/transactions/add")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={18} />
            {t("transactions.add")}
          </button>
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center p-6">
            <p className="text-sm text-slate-500">{t("transactions.loading")}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-500">
              <CreditCard size={24} />
            </div>

            <h2 className="mt-4 font-semibold text-slate-900">
              {t("transactions.emptyTitle")}
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              {t("transactions.emptyBody")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={`shrink-0 rounded-xl p-3 ${
                      transaction.type === "income"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {categoryLabel(transaction.category_name)}

                      {transaction.parent_category_name && (
                        <>
                          <span className="mx-1">·</span>
                          {categoryLabel(transaction.parent_category_name)}
                        </>
                      )}

                      <span className="mx-1">·</span>
                      {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                </div>

                <p
                  className={`shrink-0 text-base font-semibold ${
                    transaction.type === "income"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatAmount(transaction.amount_minor)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
