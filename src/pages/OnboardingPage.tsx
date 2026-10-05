import { useState } from "react";
import { saveOnboarding } from "../api/onboarding.js";

export default function OnboardingPage() {
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
          result.data.message || "Unable to save your onboarding information",
        );
      }

      window.location.href = "/app";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save your onboarding information",
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
            <p className="text-sm font-semibold text-slate-500">MoneyFlow</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Let’s set up your MoneyFlow
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tell us a little about your finances so we can personalize your
              experience.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="currency"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What currency do you use?
              </label>

              <select
                id="currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="NGN">Nigerian Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="GBP">British Pound (£)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="income-source"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What is your main source of income?
              </label>

              <select
                id="income-source"
                value={incomeSource}
                onChange={(event) => setIncomeSource(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Select an income source</option>
                <option value="salary">Salary</option>
                <option value="freelance">Freelance</option>
                <option value="business">Business</option>
                <option value="investments">Investments</option>
                <option value="family_support">Family support</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="financial-objective"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What is your main financial goal?
              </label>

              <select
                id="financial-objective"
                value={financialObjective}
                onChange={(event) => setFinancialObjective(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">Select your main objective</option>
                <option value="control_spending">Control my spending</option>
                <option value="save_more">Save more money</option>
                <option value="build_emergency_fund">
                  Build an emergency fund
                </option>
                <option value="pay_off_debt">Pay off debt</option>
                <option value="reach_financial_goal">
                  Reach a financial goal
                </option>
                <option value="understand_money">
                  Understand where my money goes
                </option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="monthly-income"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                What is your approximate monthly income?
              </label>

              <input
                id="monthly-income"
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome}
                onChange={(event) => setMonthlyIncome(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <p className="mt-2 text-xs text-slate-500">
                This is optional. You can add or change it later.
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
              {isSubmitting ? "Saving..." : "Continue to MoneyFlow"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
