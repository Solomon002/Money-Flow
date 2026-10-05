import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Plus, Target } from "lucide-react";
import { deleteGoal, getGoals, type Goal } from "../api/goals.js";
import { useAuth } from "../context/AuthContext.js";

export default function GoalsPage() {
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingGoalId, setDeletingGoalId] = useState("");

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
    async function loadGoals() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const result = await getGoals();

        if (!result.response.ok) {
          throw new Error(result.data.message || "Unable to load goals");
        }

        setGoals(result.data.goals);
      } catch (error) {
        console.error("Loading goals failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load goals",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadGoals();
  }, []);

  const activeGoals = useMemo(
    () => goals.filter((goal) => goal.status === "active"),
    [goals],
  );

  const completedGoals = useMemo(
    () => goals.filter((goal) => goal.status === "completed"),
    [goals],
  );

  function formatMoney(amountMinor: number) {
    return `${currencySymbol}${(amountMinor / 100).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatTargetDate(targetDate: string | null) {
    if (!targetDate) {
      return "";
    }

    const datePart = targetDate.slice(0, 10);

    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!match) {
      return "Invalid date";
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return "Invalid date";
    }

    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getProgress(goal: Goal) {
    if (goal.target_amount_minor <= 0) {
      return 0;
    }

    return Math.min(
      Math.max(
        (Number(goal.current_amount_minor) / Number(goal.target_amount_minor)) *
          100,
        0,
      ),
      100,
    );
  }

  async function handleDeleteGoal(goal: Goal) {
    const confirmed = window.confirm(`Delete the "${goal.name}" goal?`);

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setDeletingGoalId(goal.id);

    try {
      const result = await deleteGoal(goal.id);

      if (!result.response.ok) {
        throw new Error(result.data.message || "Unable to delete goal");
      }

      setGoals((currentGoals) =>
        currentGoals.filter((currentGoal) => currentGoal.id !== goal.id),
      );
    } catch (error) {
      console.error("Deleting goal failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete goal",
      );
    } finally {
      setDeletingGoalId("");
    }
  }

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
            <p className="text-sm text-slate-500">Financial planning</p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">Goals</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/app/goals/add")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus size={18} />
          Add goal
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

      {isLoading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Loading goals...</p>
        </section>
      ) : goals.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Target size={24} className="text-slate-700" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            No goals yet
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create a financial goal and start tracking your progress.
          </p>

          <button
            type="button"
            onClick={() => navigate("/app/goals/add")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus size={18} />
            Create goal
          </button>
        </section>
      ) : (
        <div className="space-y-8">
          {activeGoals.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Active goals
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Keep track of the progress you're making toward your goals.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {activeGoals.map((goal) => {
                  const progress = getProgress(goal);

                  const remainingAmount = Math.max(
                    Number(goal.target_amount_minor) -
                      Number(goal.current_amount_minor),
                    0,
                  );

                  const isDeleting = deletingGoalId === goal.id;

                  return (
                    <section
                      key={goal.id}
                      className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            {goal.name}
                          </h3>

                          {goal.description && (
                            <p className="mt-1 text-sm text-slate-500">
                              {goal.description}
                            </p>
                          )}
                        </div>

                        <Target size={20} className="shrink-0 text-slate-500" />
                      </div>

                      <div className="mt-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-2xl font-bold text-slate-900">
                            {formatMoney(Number(goal.current_amount_minor))}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            of {formatMoney(Number(goal.target_amount_minor))}
                          </p>
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          {progress.toFixed(0)}%
                        </p>
                      </div>

                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-slate-900 transition-all"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Remaining</span>

                        <span className="font-semibold text-slate-700">
                          {formatMoney(remainingAmount)}
                        </span>
                      </div>

                      {goal.target_date && (
                        <p className="mt-3 text-sm text-slate-500">
                          Target date: {formatTargetDate(goal.target_date)}
                        </p>
                      )}

                      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/app/goals/add-money/${goal.id}`)
                          }
                          className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Add money
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/app/goals/edit/${goal.id}`)}
                          className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteGoal(goal)}
                          disabled={isDeleting}
                          className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>
          )}

          {completedGoals.length > 0 && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Completed goals
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {completedGoals.map((goal) => (
                  <section
                    key={goal.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {goal.name}
                        </h3>

                        <p className="mt-1 text-sm font-medium text-green-600">
                          Goal completed
                        </p>
                      </div>

                      <Target size={20} className="text-slate-500" />
                    </div>

                    <div className="mt-5">
                      <p className="text-2xl font-bold text-slate-900">
                        {formatMoney(Number(goal.current_amount_minor))}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Target reached
                      </p>
                    </div>

                    {goal.target_date && (
                      <p className="mt-3 text-sm text-slate-500">
                        Target date: {formatTargetDate(goal.target_date)}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal)}
                      disabled={deletingGoalId === goal.id}
                      className="mt-5 w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingGoalId === goal.id ? "Deleting..." : "Delete"}
                    </button>
                  </section>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
