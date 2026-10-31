import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.js";
import AccountDataSection from "../components/AccountDataSection.js";
import { CURRENCIES, currencyLabel } from "../i18n/currencies.js";
import { formatDate } from "../i18n/format.js";
import {
  FINANCIAL_OBJECTIVES,
  INCOME_SOURCES,
} from "../i18n/options.js";
import {
  Check,
  CheckCircle2,
  Circle,
  Crown,
  Lock,
  Save,
  Shield,
} from "lucide-react";

import {
  changePassword,
  getSettings,
  updateSettings,
  type Settings,
} from "../api/settings.js";
import { useNavigate } from "react-router";

import {
  cancelSubscription,
  getSubscription,
  reactivateSubscription,
  type Subscription,
} from "../api/subscription.js";

function NotificationOption({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <div>
        <p className="font-medium text-slate-900">{label}</p>

        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-slate-900" : "bg-slate-300"
        }`}
        aria-label={`${label}: ${enabled ? t("settings.enabled") : t("settings.disabled")}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function PasswordRequirement({
  met,
  children,
}: {
  met: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check size={16} className="shrink-0 text-emerald-600" />
      ) : (
        <Circle size={16} className="shrink-0 text-slate-400" />
      )}

      <span className={met ? "text-emerald-700" : "text-slate-500"}>
        {children}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings | null>(null);

  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const [subscriptionError, setSubscriptionError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currencyCode, setCurrencyCode] = useState("NGN");
  const [incomeSource, setIncomeSource] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState("");
  const [financialObjective, setFinancialObjective] = useState("");

  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);
  const [goalRemindersEnabled, setGoalRemindersEnabled] = useState(true);
  const [monthlyInsightsEnabled, setMonthlyInsightsEnabled] = useState(true);
  const [recurringRemindersEnabled, setRecurringRemindersEnabled] =
    useState(true);

  const [emailChangePassword, setEmailChangePassword] = useState("");

  const emailChanged =
    settings !== null &&
    email.trim().toLowerCase() !== settings.email.toLowerCase();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccess, setCancelSuccess] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const response = await getSettings();

        const loadedSettings = response.data.settings;

        setSettings(loadedSettings);

        setName(loadedSettings.name);
        setEmail(loadedSettings.email);

        setCurrencyCode(loadedSettings.currency_code);

        setIncomeSource(loadedSettings.income_source ?? "");

        setMonthlyIncome(
          loadedSettings.monthly_income_minor !== null
            ? String(loadedSettings.monthly_income_minor / 100)
            : "",
        );

        setMonthlySavingsTarget(
          loadedSettings.monthly_savings_target_minor !== null
            ? String(loadedSettings.monthly_savings_target_minor / 100)
            : "",
        );

        setFinancialObjective(loadedSettings.financial_objective ?? "");

        setBudgetAlertsEnabled(loadedSettings.budget_alerts_enabled);

        setGoalRemindersEnabled(loadedSettings.goal_reminders_enabled);

        setMonthlyInsightsEnabled(loadedSettings.monthly_insights_enabled);

        setRecurringRemindersEnabled(
          loadedSettings.recurring_reminders_enabled,
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error ? err.message : t("settings.loadFailed"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    async function loadSubscription() {
      try {
        setSubscriptionLoading(true);
        setSubscriptionError("");

        const response = await getSubscription();

        if (!response.response.ok) {
          throw new Error(
            response.data.message || t("pro.loadFailed"),
          );
        }

        setSubscription(response.data.subscription);
      } catch (err) {
        console.error("Loading subscription failed:", err);

        setSubscriptionError(
          err instanceof Error ? err.message : t("pro.loadFailed"),
        );
      } finally {
        setSubscriptionLoading(false);
      }
    }

    loadSubscription();
  }, []);

  async function saveSettings() {
    const response = await updateSettings({
      name,
      email,
      currentPassword: emailChanged ? emailChangePassword : undefined,
      currencyCode,
      incomeSource: incomeSource.trim() || null,
      monthlyIncome: monthlyIncome.trim() === "" ? null : Number(monthlyIncome),
      monthlySavingsTarget:
        monthlySavingsTarget.trim() === ""
          ? null
          : Number(monthlySavingsTarget),
      financialObjective: financialObjective.trim() || null,
      appearance: settings?.appearance ?? "system",
      budgetAlertsEnabled,
      goalRemindersEnabled,
      monthlyInsightsEnabled,
      recurringRemindersEnabled,
    });

    setSettings(response.data.settings);
    setEmailChangePassword("");
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      await saveSettings();

      setSuccess(t("settings.profileSaved"));
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : t("settings.profileFailed"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveFinancial(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingFinancial(true);
      setError("");
      setSuccess("");

      await saveSettings();

      setSuccess(t("settings.financialSaved"));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t("settings.financialFailed"),
      );
    } finally {
      setSavingFinancial(false);
    }
  }

  async function handleSaveNotifications(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingNotifications(true);
      setError("");
      setSuccess("");

      await saveSettings();

      setSuccess(t("settings.notificationsSaved"));
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : t("settings.notificationsFailed"),
      );
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();

    setPasswordError("");

    if (currentPassword.length === 0) {
      setPasswordError(t("settings.password.currentRequired"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("auth.rules.notMet"));
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError(t("auth.rules.notMet"));
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError(t("auth.rules.notMet"));
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError(t("auth.rules.notMet"));
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError(t("auth.rules.notMet"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("auth.passwordsDontMatch"));
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        t("settings.password.mustDiffer"),
      );
      return;
    }

    try {
      setChangingPassword(true);

      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowPasswordSuccess(true);
    } catch (err) {
      console.error(err);

      setPasswordError(
        err instanceof Error ? err.message : t("settings.password.failed"),
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleCancelSubscription() {
    try {
      setCancelling(true);
      setCancelError("");
      setCancelSuccess("");

      const response = await cancelSubscription();

      if (!response.response.ok) {
        throw new Error(
          response.data.message || t("settings.pro.cancelFailed"),
        );
      }

      if (response.data.subscription) {
        setSubscription(response.data.subscription);
      }

      setCancelSuccess(
        t("settings.pro.cancelled"),
      );
    } catch (err) {
      console.error(err);

      setCancelError(
        err instanceof Error ? err.message : t("settings.pro.cancelFailed"),
      );
    } finally {
      setCancelling(false);
    }
  }

  async function handleReactivateSubscription() {
    try {
      setReactivating(true);
      setCancelError("");
      setCancelSuccess("");

      const response = await reactivateSubscription();

      if (!response.response.ok) {
        throw new Error(
          response.data.message || t("settings.pro.reactivateFailed"),
        );
      }

      if (response.data.subscription) {
        setSubscription(response.data.subscription);
      }

      setCancelSuccess(
        t("settings.pro.reactivated"),
      );
    } catch (err) {
      console.error(err);

      setCancelError(
        err instanceof Error
          ? err.message
          : t("settings.pro.reactivateFailed"),
      );
    } finally {
      setReactivating(false);
    }
  }

  function handleContinueToSignIn() {
    window.location.href = "/login";
  }

  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const passwordIsStrong =
    passwordRequirements.length &&
    passwordRequirements.uppercase &&
    passwordRequirements.lowercase &&
    passwordRequirements.number &&
    passwordRequirements.special;

  if (loading) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-500">{t("settings.loading")}</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || t("settings.loadFailed")}
          </div>
        </div>
      </div>
    );
  }

  const currencyIsLocked = settings.has_financial_records;

  const isPro =
    subscription?.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "cancelled");

  const isCancelled = subscription?.status === "cancelled";

  const isExpired = subscription?.status === "expired";

  const formattedExpiryDate =
    isExpired && subscription?.current_period_end
      ? formatDate(new Date(subscription.current_period_end), {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const formattedCancellationDate =
    isCancelled && subscription?.current_period_end
      ? formatDate(new Date(subscription.current_period_end), {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t("nav.settings")}</h1>

            <p className="mt-1 text-sm text-slate-500">
              {t("settings.subtitle")}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Profile */}
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t("settings.profile")}</h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("settings.profileBody")}
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("auth.name")}
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("auth.email")}
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("common.language")}
                </label>

                <LanguageSwitcher />
              </div>

              {emailChanged && (
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {t("settings.password.current")}
                  </label>

                  <input
                    type="password"
                    autoComplete="current-password"
                    value={emailChangePassword}
                    onChange={(event) =>
                      setEmailChangePassword(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    {t("settings.emailPasswordHint")}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {savingProfile ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>

          {/* Financial preferences */}
          <form
            onSubmit={handleSaveFinancial}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("settings.financial")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t("settings.financialBody")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  {t("settings.currency")}
                  {currencyIsLocked && (
                    <Lock size={14} className="text-slate-400" />
                  )}
                </label>

                <select
                  value={currencyCode}
                  onChange={(event) => setCurrencyCode(event.target.value)}
                  disabled={currencyIsLocked}
                  className={`w-full rounded-xl border px-4 py-3 outline-none ${
                    currencyIsLocked
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500"
                      : "border-slate-300 bg-white focus:border-slate-900"
                  }`}
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {currencyLabel(code)}
                    </option>
                  ))}
                </select>

                {currencyIsLocked && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t("settings.currencyLocked")}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("settings.incomeSource")}
                </label>

                <select
                  value={incomeSource}
                  onChange={(event) => setIncomeSource(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">{t("options.incomeSource.placeholder")}</option>

                  {INCOME_SOURCES.map((option) => (
                    <option key={option} value={option}>
                      {t(`options.incomeSource.${option}`)}
                    </option>
                  ))}

                  {/* Older accounts may have typed their own answer. */}
                  {incomeSource &&
                    !(INCOME_SOURCES as readonly string[]).includes(incomeSource) && (
                      <option value={incomeSource}>{incomeSource}</option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("settings.monthlyIncome")}
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlyIncome}
                  onChange={(event) => setMonthlyIncome(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("settings.savingsTarget")}
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={monthlySavingsTarget}
                  onChange={(event) =>
                    setMonthlySavingsTarget(event.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("settings.objective")}
                </label>

                <select
                  value={financialObjective}
                  onChange={(event) => setFinancialObjective(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
                >
                  <option value="">{t("options.objective.placeholder")}</option>

                  {FINANCIAL_OBJECTIVES.map((option) => (
                    <option key={option} value={option}>
                      {t(`options.objective.${option}`)}
                    </option>
                  ))}

                  {/* Older accounts may have typed their own answer. */}
                  {financialObjective &&
                    !(FINANCIAL_OBJECTIVES as readonly string[]).includes(financialObjective) && (
                      <option value={financialObjective}>{financialObjective}</option>
                    )}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingFinancial}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {savingFinancial ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>

          {/* MoneyFlow Pro */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Crown size={21} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">
                      MoneyFlow Pro
                    </h2>

                    {!subscriptionLoading && subscription && (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          isPro && !isCancelled
                            ? "bg-emerald-100 text-emerald-700"
                            : isCancelled
                              ? "bg-slate-200 text-slate-700"
                              : isExpired
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isPro && !isCancelled
                          ? t("settings.pro.active")
                          : isCancelled
                            ? t("settings.pro.cancelledBadge")
                            : isExpired
                              ? t("settings.pro.expired")
                              : t("settings.pro.freePlan")}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {t("settings.pro.body")}
                  </p>
                </div>
              </div>
            </div>

            {subscriptionLoading ? (
              <div className="p-4 sm:p-6">
                <p className="text-sm text-slate-500">
                  {t("settings.pro.loading")}
                </p>
              </div>
            ) : subscriptionError ? (
              <div className="p-4 sm:p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {subscriptionError}
                </div>
              </div>
            ) : isPro ? (
              <div className="p-4 sm:p-6">
                {isCancelled ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <Crown
                        size={21}
                        className="mt-0.5 shrink-0 text-slate-500"
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {t("settings.pro.cancelledTitle")}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {formattedCancellationDate
                            ? t("settings.pro.keepUntil", { date: formattedCancellationDate })
                            : t("settings.pro.keepUntilEnd")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={21}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <div>
                        <p className="font-semibold text-emerald-900">
                          {t("settings.pro.usingPro")}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-emerald-800">
                          {t("settings.pro.usingProBody")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">
                      {t("pro.features.advancedReports")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {t("settings.pro.advancedReportsBody")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="font-medium text-slate-900">
                      {t("pro.deeperInsights")}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {t("settings.pro.deeperInsightsBody")}
                    </p>
                  </div>
                </div>

                {cancelError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {cancelError}
                  </div>
                )}

                {cancelSuccess && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    {cancelSuccess}
                  </div>
                )}

                <div className="mt-5 flex justify-end">
                  {isCancelled ? (
                    <button
                      type="button"
                      onClick={handleReactivateSubscription}
                      disabled={reactivating}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reactivating ? t("settings.pro.reactivating") : t("settings.pro.reactivate")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {cancelling ? t("settings.pro.cancelling") : t("settings.pro.cancel")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div
                  className={`rounded-xl border p-4 sm:p-5 ${
                    isExpired
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p
                    className={`font-semibold ${
                      isExpired ? "text-amber-900" : "text-slate-900"
                    }`}
                  >
                    {isExpired
                      ? t("settings.pro.expiredTitle")
                      : t("settings.pro.unlockTitle")}
                  </p>

                  <p
                    className={`mt-1 text-sm leading-6 ${
                      isExpired ? "text-amber-800" : "text-slate-500"
                    }`}
                  >
                    {isExpired && formattedExpiryDate
                      ? t("settings.pro.endedOn", { date: formattedExpiryDate })
                      : t("settings.pro.unlockBody")}
                  </p>

                  <div className="mt-5 grid gap-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {t("pro.features.advancedReports")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {t("settings.pro.analyzeBody")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {t("pro.features.topSpending")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {t("settings.pro.topSpendingBody")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />

                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {t("settings.pro.budgetPerformance")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {t("settings.pro.budgetPerformanceBody")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`mt-6 rounded-xl border p-4 ${
                      isExpired
                        ? "border-amber-200 bg-white"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Lock
                        size={18}
                        className="mt-0.5 shrink-0 text-slate-500"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {isExpired
                            ? t("settings.pro.renewTitle")
                            : t("settings.pro.upgradeTitle")}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {isExpired
                            ? t("settings.pro.renewBody")
                            : t("settings.pro.upgradeBody")}
                        </p>

                        <button
                          type="button"
                          onClick={() => navigate("/app/pro")}
                          className={`mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white transition ${
                            isExpired
                              ? "bg-amber-900 hover:bg-amber-800"
                              : "bg-slate-900 hover:bg-slate-800"
                          }`}
                        >
                          {isExpired ? t("proExpiry.renew") : t("settings.pro.explore")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Notifications */}
          <form
            onSubmit={handleSaveNotifications}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("notifications.title")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t("settings.notificationsBody")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <NotificationOption
                label={t("settings.toggles.budgetAlerts")}
                description={t("settings.toggles.budgetAlertsBody")}
                enabled={budgetAlertsEnabled}
                onChange={setBudgetAlertsEnabled}
              />

              <NotificationOption
                label={t("settings.toggles.goalReminders")}
                description={t("settings.toggles.goalRemindersBody")}
                enabled={goalRemindersEnabled}
                onChange={setGoalRemindersEnabled}
              />

              <NotificationOption
                label={t("settings.toggles.monthlyInsights")}
                description={t("settings.toggles.monthlyInsightsBody")}
                enabled={monthlyInsightsEnabled}
                onChange={setMonthlyInsightsEnabled}
              />

              <NotificationOption
                label={t("settings.toggles.recurring")}
                description={t("settings.toggles.recurringBody")}
                enabled={recurringRemindersEnabled}
                onChange={setRecurringRemindersEnabled}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingNotifications}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {savingNotifications ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>

          {/* Security */}
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Shield size={22} className="mt-0.5 text-slate-700" />

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t("settings.security")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t("settings.securityBody")}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("settings.password.current")}
                </label>

                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("auth.newPassword")}
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordError("");
                  }}
                  autoComplete="new-password"
                  className={`w-full rounded-xl border px-4 py-3 outline-none ${
                    newPassword.length > 0 && passwordIsStrong
                      ? "border-emerald-500 focus:border-emerald-600"
                      : "border-slate-300 focus:border-slate-900"
                  }`}
                />

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">
                    {t("auth.rules.title")}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PasswordRequirement met={passwordRequirements.length}>
                      {t("auth.rules.length")}
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.uppercase}>
                      {t("auth.rules.uppercase")}
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.lowercase}>
                      {t("auth.rules.lowercase")}
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.number}>
                      {t("auth.rules.number")}
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.special}>
                      {t("auth.rules.special")}
                    </PasswordRequirement>

                    <PasswordRequirement
                      met={
                        confirmPassword.length > 0 &&
                        confirmPassword === newPassword
                      }
                    >
                      {t("auth.rules.match")}
                    </PasswordRequirement>
                  </div>

                  {newPassword.length > 0 && passwordIsStrong && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 size={17} />
                      {t("settings.password.strong")}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {t("auth.confirmNewPassword")}
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className={`w-full rounded-xl border px-4 py-3 outline-none ${
                    confirmPassword.length > 0 &&
                    confirmPassword === newPassword
                      ? "border-emerald-500 focus:border-emerald-600"
                      : "border-slate-300 focus:border-slate-900"
                  }`}
                />

                {confirmPassword.length > 0 &&
                  confirmPassword === newPassword && (
                    <p className="mt-2 text-xs text-emerald-600">
                      {t("settings.password.match")}
                    </p>
                  )}
              </div>

              {passwordError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Lock size={17} />

                {changingPassword ? t("settings.password.changing") : t("settings.password.change")}
              </button>
            </div>
          </form>

          <AccountDataSection
            email={settings.email}
            hasPassword={settings.has_password}
          />
        </div>
      </div>

      {/* Password success popup */}
      {showPasswordSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={30} className="text-emerald-600" />
              </div>

              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                {t("settings.password.changedTitle")}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("settings.password.changedBody")}
              </p>

              <button
                type="button"
                onClick={handleContinueToSignIn}
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {t("settings.password.continue")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
