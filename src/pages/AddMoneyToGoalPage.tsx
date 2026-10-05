import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { addMoneyToGoal, getGoals, type Goal } from "../api/goals.js";
import { useAuth } from "../context/AuthContext.js";

export default function AddMoneyToGoalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { onboardingPreferences } = useAuth();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [amount, setAmount] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    async function loadGoal() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getGoals();

        if (!result.response.ok) {
          throw new Error(result.data.message || "Unable to load goals");
        }

        const selectedGoal = result.data.goals.find(
          (item: Goal) => item.id === id,
        );

        if (!selectedGoal) {
          throw new Error("Goal not found");
        }

        setGoal(selectedGoal);
      } catch (error) {
        console.error("Loading goal failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load goal",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadGoal();
  }, [id]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!id) {
      setErrorMessage("Goal ID is missing.");
      return;
    }

    if (!goal) {
      setErrorMessage("Goal could not be found.");
      return;
    }

    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage("Please enter an amount greater than zero.");
      return;
    }

    const remainingAmount =
      (Number(goal.target_amount_minor) - Number(goal.current_amount_minor)) /
      100;

    if (amountNumber > remainingAmount) {
      setErrorMessage(
        "Amount cannot be greater than the remaining goal balance.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const result = await addMoneyToGoal(id, amountNumber);

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to add money to goal");
      }

      navigate("/app/goals");
    } catch (error) {
      console.error("Adding money to goal failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add money to goal",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Loading goal...</p>
        </section>
      </div>
    );
  }

  const remainingAmount = goal
    ? Math.max(
        (Number(goal.target_amount_minor) - Number(goal.current_amount_minor)) /
          100,
        0,
      )
    : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/goals")}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">Financial planning</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">Add money</h1>
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

      {goal && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-sm text-slate-500">Adding money to</p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {goal.name}
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Current amount</p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {currencySymbol}
                {(Number(goal.current_amount_minor) / 100).toLocaleString(
                  "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Remaining</p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {currencySymbol}
                {remainingAmount.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-slate-700"
              >
                Amount to add
              </label>

              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  {currencySymbol}
                </span>

                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  max={remainingAmount}
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/app/goals")}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || remainingAmount <= 0}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Add money"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
