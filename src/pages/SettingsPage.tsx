import { FormEvent, useEffect, useState } from "react";
import { Check, CheckCircle2, Circle, Lock, Save, Shield } from "lucide-react";

import {
  changePassword,
  getSettings,
  updateSettings,
  type Settings,
} from "../api/settings.js";

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
        aria-label={`${label}: ${enabled ? "enabled" : "disabled"}`}
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
  const [settings, setSettings] = useState<Settings | null>(null);

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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingFinancial, setSavingFinancial] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [passwordError, setPasswordError] = useState("");

  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);

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
          err instanceof Error ? err.message : "Unable to load settings",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function saveSettings() {
    const response = await updateSettings({
      name,
      email,
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
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");

      await saveSettings();

      setSuccess("Profile saved successfully.");
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Unable to save profile");
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

      setSuccess("Financial preferences saved successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save financial preferences",
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

      setSuccess("Notification preferences saved successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save notification preferences",
      );
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();

    setPasswordError("");

    if (currentPassword.length === 0) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("Password must contain at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError("Password must contain at least one special character.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "New password must be different from your current password.",
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
        err instanceof Error ? err.message : "Unable to change password",
      );
    } finally {
      setChangingPassword(false);
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
          <p className="text-sm text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || "Settings could not be loaded."}
          </div>
        </div>
      </div>
    );
  }

  const currencyIsLocked = settings.has_financial_records;

  return (
    <>
      <div className="p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your account and MoneyFlow preferences.
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
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profile</h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your personal account information.
              </p>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {savingProfile ? "Saving..." : "Save"}
              </button>
            </div>
          </form>

          {/* Financial preferences */}
          <form
            onSubmit={handleSaveFinancial}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Financial preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your currency and financial planning preferences.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  Currency
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
                  <option value="NGN">Nigerian Naira (₦)</option>

                  <option value="USD">US Dollar ($)</option>

                  <option value="GBP">British Pound (£)</option>

                  <option value="EUR">Euro (€)</option>
                </select>

                {currencyIsLocked && (
                  <p className="mt-2 text-xs text-slate-500">
                    Currency is locked because you already have financial
                    records. This prevents existing amounts from being
                    interpreted as a different currency.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Income source
                </label>

                <input
                  value={incomeSource}
                  onChange={(event) => setIncomeSource(event.target.value)}
                  placeholder="e.g. Salary, Freelance"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Monthly income
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
                  Monthly savings target
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
                  Financial objective
                </label>

                <textarea
                  value={financialObjective}
                  onChange={(event) =>
                    setFinancialObjective(event.target.value)
                  }
                  rows={3}
                  placeholder="What are you trying to achieve financially?"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={savingFinancial}
                className="inline-flex tems-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {savingFinancial ? "Saving..." : "Save"}
              </button>
            </div>
          </form>

          {/* Notifications */}
          <form
            onSubmit={handleSaveNotifications}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose which MoneyFlow notifications you want to receive.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <NotificationOption
                label="Budget alerts"
                description="Get notified when you approach or exceed a budget."
                enabled={budgetAlertsEnabled}
                onChange={setBudgetAlertsEnabled}
              />

              <NotificationOption
                label="Goal reminders"
                description="Receive reminders about your financial goals."
                enabled={goalRemindersEnabled}
                onChange={setGoalRemindersEnabled}
              />

              <NotificationOption
                label="Monthly insights"
                description="Receive monthly summaries and spending insights."
                enabled={monthlyInsightsEnabled}
                onChange={setMonthlyInsightsEnabled}
              />

              <NotificationOption
                label="Recurring transaction reminders"
                description="Get reminders about upcoming recurring transactions."
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

                {savingNotifications ? "Saving..." : "Save"}
              </button>
            </div>
          </form>

          {/* Security */}
          <form
            onSubmit={handleChangePassword}
            className="rounded-2xl border border-slate-200 bg-white p-6"
          >
            <div className="flex items-start gap-3">
              <Shield size={22} className="mt-0.5 text-slate-700" />

              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Security
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Change your MoneyFlow account password.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Current password
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
                  New password
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
                    Use a strong password with:
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <PasswordRequirement met={passwordRequirements.length}>
                      At least 8 characters
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.uppercase}>
                      One uppercase letter
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.lowercase}>
                      One lowercase letter
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.number}>
                      One number
                    </PasswordRequirement>

                    <PasswordRequirement met={passwordRequirements.special}>
                      One special character
                    </PasswordRequirement>
                  </div>

                  {newPassword.length > 0 && passwordIsStrong && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
                      <CheckCircle2 size={17} />
                      Strong password
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm new password
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
                      Passwords match.
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

                {changingPassword ? "Changing password..." : "Change password"}
              </button>
            </div>
          </form>
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
                Password changed successfully
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your password has been changed. Please sign in again using your
                new password.
              </p>

              <button
                type="button"
                onClick={handleContinueToSignIn}
                className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Continue to sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
