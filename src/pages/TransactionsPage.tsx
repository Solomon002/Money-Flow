import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from "lucide-react";
import { getTransactions, type Transaction } from "../api/transactions.js";
import { useAuth } from "../context/AuthContext.js";

export default function TransactionsPage() {
  const { onboardingPreferences } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    async function loadTransactions() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getTransactions();

        if (!result.response.ok) {
          throw new Error(result.data.message || "Unable to load transactions");
        }

        setTransactions(result.data.transactions);
      } catch (error) {
        console.error("Loading transactions failed:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load transactions",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, []);

  function formatAmount(amountMinor: number) {
    return `${currencySymbol}${(amountMinor / 100).toLocaleString("en-NG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(dateString: string) {
    if (!dateString) {
      return "Unknown date";
    }

    const date = dateString.includes("T")
      ? new Date(dateString)
      : new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">Money activity</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Transactions
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            View your income and expenses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/transactions/add")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add transaction
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center p-6">
            <p className="text-sm text-slate-500">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <div className="rounded-full bg-slate-100 p-4 text-slate-500">
              <CreditCard size={24} />
            </div>

            <h2 className="mt-4 font-semibold text-slate-900">
              No transactions yet
            </h2>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Your income and expenses will appear here after you add your first
              transaction.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-xl p-3 ${
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

                  <div>
                    <p className="font-semibold text-slate-900">
                      {transaction.description}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {transaction.category_name} ·{" "}
                      {formatDate(transaction.transaction_date)}
                    </p>
                  </div>
                </div>

                <p
                  className={`text-base font-semibold ${
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
