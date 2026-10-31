import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { createGoal } from "../api/goals.js";
import { useAuth } from "../context/AuthContext.js";
import { currencySymbol as getCurrencySymbol } from "../i18n/format.js";

export default function AddGoalPage() {
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currencySymbol = getCurrencySymbol(
    onboardingPreferences?.currency_code || "NGN",
  );

  function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage(t("goals.form.nameError"));
      return;
    }

    const targetAmountNumber = Number(targetAmount);

    if (!Number.isFinite(targetAmountNumber) || targetAmountNumber <= 0) {
      setErrorMessage(t("goals.form.targetError"));
      return;
    }

    const currentAmountNumber = Number(currentAmount);

    if (!Number.isFinite(currentAmountNumber) || currentAmountNumber < 0) {
      setErrorMessage(t("goals.form.currentError"));
      return;
    }

    if (currentAmountNumber > targetAmountNumber) {
      setErrorMessage(
        "Current amount cannot be greater than the target amount.",
      );
      return;
    }

    if (targetDate && targetDate < getTodayDate()) {
      setErrorMessage(
        "The target date has passed. Please choose today or a future date.",
      );
      return;
    }

    setIsSaving(true);

    try {
      const result = await createGoal({
        name: name.trim(),
        targetAmount: targetAmountNumber,
        currentAmount: currentAmountNumber,
        targetDate: targetDate || null,
        description: description.trim() || null,
      });

      if (!result.response.ok) {
        throw new Error(result.data.message || t("goals.form.createFailed"));
      }

      navigate("/app/goals");
    } catch (error) {
      console.error("Creating goal failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : t("goals.form.createFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/goals")}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">{t("goals.eyebrow")}</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">{t("goals.add")}</h1>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label
              htmlFor="goal-name"
              className="block text-sm font-medium text-slate-700"
            >
              {t("goals.form.name")}
            </label>

            <input
              id="goal-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("goals.form.namePlaceholder")}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="target-amount"
              className="block text-sm font-medium text-slate-700"
            >
              {t("goals.form.target")}
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
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="current-amount"
              className="block text-sm font-medium text-slate-700"
            >
              {t("goals.form.alreadySaved")}
            </label>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {currencySymbol}
              </span>

              <input
                id="current-amount"
                type="number"
                min="0"
                step="0.01"
                value={currentAmount}
                onChange={(event) => setCurrentAmount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="target-date"
              className="block text-sm font-medium text-slate-700"
            >
              {t("goals.form.targetDate")}
              <span className="ml-1 font-normal text-slate-400">
                {t("common.optionalSuffix")}
              </span>
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
              htmlFor="goal-description"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.description")}
              <span className="ml-1 font-normal text-slate-400">
                {t("common.optionalSuffix")}
              </span>
            </label>

            <textarea
              id="goal-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you saving for?"
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
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t("common.saving") : t("goals.form.submit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
