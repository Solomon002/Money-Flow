import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  getGoals,
  updateGoal,
  type Goal,
  type GoalStatus,
} from "../api/goals.js";
import { useAuth } from "../context/AuthContext.js";

export default function EditGoalPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { onboardingPreferences } = useAuth();

  const [goal, setGoal] = useState<Goal | null>(null);

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");

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

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

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
        setName(selectedGoal.name);
        setTargetAmount(
          (Number(selectedGoal.target_amount_minor) / 100).toString(),
        );
        setTargetDate(selectedGoal.target_date || "");
        setDescription(selectedGoal.description || "");
        setStatus(selectedGoal.status);
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

    if (!name.trim()) {
      setErrorMessage("Please enter a goal name.");
      return;
    }

    const targetAmountNumber = Number(targetAmount);

    if (!Number.isFinite(targetAmountNumber) || targetAmountNumber <= 0) {
      setErrorMessage("Please enter a target amount greater than zero.");
      return;
    }

    if (targetDate && targetDate < getTodayDate()) {
      setErrorMessage(
        "The target date has passed. Please choose today or a future date.",
      );
      return;
    }

    const originalTargetAmount = Number(goal.target_amount_minor) / 100;

    const hasChanges =
      name.trim() !== goal.name ||
      targetAmountNumber !== originalTargetAmount ||
      (targetDate || "") !== (goal.target_date || "") ||
      description.trim() !== (goal.description || "") ||
      status !== goal.status;

    if (!hasChanges) {
      setErrorMessage("No changes made.");
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateGoal(id, {
        name: name.trim(),
        targetAmount: targetAmountNumber,
        targetDate: targetDate || null,
        description: description.trim() || null,
        status,
      });

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to update goal");
      }

      navigate("/app/goals");
    } catch (error) {
      console.error("Updating goal failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update goal",
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

          <h1 className="mt-1 text-2xl font-bold text-slate-900">Edit goal</h1>
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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="goal-name"
                className="block text-sm font-medium text-slate-700"
              >
                Goal name
              </label>

              <input
                id="goal-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="target-amount"
                className="block text-sm font-medium text-slate-700"
              >
                Target amount
              </label>

              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  {currencySymbol}
                </span>

                <input
                  id="target-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="target-date"
                className="block text-sm font-medium text-slate-700"
              >
                Target date
              </label>

              <input
                id="target-date"
                type="date"
                min={getTodayDate()}
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="goal-status"
                className="block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="goal-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as GoalStatus)
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="active">Active</option>

                <option value="paused">Paused</option>

                <option value="completed">Completed</option>

                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="goal-description"
                className="block text-sm font-medium text-slate-700"
              >
                Description
              </label>

              <textarea
                id="goal-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/app/goals")}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
