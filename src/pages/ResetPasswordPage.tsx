import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router";
import { resetPassword } from "../api/auth.js";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordRequirements = [
    {
      label: t("auth.rules.length"),
      valid: password.length >= 8,
    },
    {
      label: t("auth.rules.uppercase"),
      valid: /[A-Z]/.test(password),
    },
    {
      label: t("auth.rules.lowercase"),
      valid: /[a-z]/.test(password),
    },
    {
      label: t("auth.rules.number"),
      valid: /[0-9]/.test(password),
    },
    {
      label: t("auth.rules.special"),
      valid: /[^A-Za-z0-9]/.test(password),
    },
    {
      label: t("auth.rules.match"),
      valid: confirmPassword.length > 0 && password === confirmPassword,
    },
  ];

  const isPasswordValid = passwordRequirements.every(
    (requirement) => requirement.valid,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!token) {
      setErrorMessage(t("auth.reset.invalidLink"));
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage(t("auth.rules.notMet"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("auth.passwordsDontMatch"));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword(token, password);

      if (!result.response.ok) {
        throw new Error(result.data.message || t("auth.reset.failed"));
      }

      navigate("/login", {
        state: {
          registrationSuccess:
            t("auth.reset.success"),
        },
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("auth.reset.failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8">
            <Link
              to="/"
              className="mb-6 inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              ← {t("auth.backToMoneyFlow")}
            </Link>

            <p className="text-sm font-semibold text-slate-500">MoneyFlow</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {t("auth.reset.title")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t("auth.reset.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("auth.newPassword")}
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t("auth.newPasswordPlaceholder")}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />

              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">
                  {t("auth.rules.title")}
                </p>

                <ul className="space-y-1.5">
                  {passwordRequirements.map((requirement) => (
                    <li
                      key={requirement.label}
                      className={`flex items-center gap-2 text-xs ${
                        requirement.valid
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                          requirement.valid ? "bg-emerald-100" : "bg-slate-200"
                        }`}
                      >
                        {requirement.valid ? "✓" : "•"}
                      </span>

                      {requirement.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("auth.confirmNewPassword")}
              </label>

              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t("auth.confirmPasswordPlaceholder")}
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t("auth.reset.submitting") : t("auth.reset.submit")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t("auth.rememberPassword")}{" "}
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              {t("auth.login.submit")}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
