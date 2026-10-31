import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.js";
import { CURRENCIES, currencyLabel } from "../i18n/currencies.js";
import {
  FINANCIAL_OBJECTIVES,
  INCOME_SOURCES,
} from "../i18n/options.js";
import { saveOnboarding } from "../api/onboarding.js";

export default function OnboardingPage() {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState("NGN");
  const [incomeSource, setIncomeSource] = useState("");
  const [financialObjective, setFinancialObjective] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await saveOnboarding({
        currency,
        incomeSource,
        financialObjective,
        monthlyIncome,
      });

      if (!result.response.ok) {
        throw new Error(
          result.data.message || t("onboarding.failed"),
        );
      }

      window.location.href = "/app";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("onboarding.failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">MoneyFlow</p>

              <LanguageSwitcher />
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {t("onboarding.title")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t("onboarding.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("onboarding.currency")}
              </label>

              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {currencyLabel(code)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="income-source"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("onboarding.incomeSource")}
              </label>

              <select
                id="income-source"
                value={incomeSource}
                onChange={(event) => setIncomeSource(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{t("options.incomeSource.placeholder")}</option>
                {INCOME_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {t(`options.incomeSource.${source}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="financial-objective"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("onboarding.objective")}
              </label>

              <select
                id="financial-objective"
                value={financialObjective}
                onChange={(event) => setFinancialObjective(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">{t("options.objective.placeholder")}</option>
                {FINANCIAL_OBJECTIVES.map((objective) => (
                  <option key={objective} value={objective}>
                    {t(`options.objective.${objective}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="monthly-income"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("onboarding.monthlyIncome")}
              </label>

              <input
                id="monthly-income"
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome}
                onChange={(event) => setMonthlyIncome(event.target.value)}
                placeholder={t("common.optional")}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-2 text-xs text-slate-500">
                {t("onboarding.monthlyIncomeHint")}
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t("common.saving") : t("onboarding.submit")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
