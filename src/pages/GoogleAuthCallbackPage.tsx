import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { exchangeGoogleAuthCode, getCurrentUser } from "../api/auth.js";
import { saveAuthTokens } from "../api/authStorage.js";

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [error, setError] = useState("");

  useEffect(() => {
    handleGoogleCallback();
  }, []);

  async function handleGoogleCallback() {
    const code = searchParams.get("code");

    if (!code) {
      setError(t("auth.google.failedBody"));
      return;
    }

    try {
      const exchangeResult = await exchangeGoogleAuthCode(code);

      if (
        !exchangeResult.response.ok ||
        !exchangeResult.data.accessToken ||
        !exchangeResult.data.refreshToken
      ) {
        throw new Error(
          exchangeResult.data.message || t("auth.google.failedBody"),
        );
      }

      saveAuthTokens(
        exchangeResult.data.accessToken,
        exchangeResult.data.refreshToken,
      );

      const currentUserResult = await getCurrentUser(
        exchangeResult.data.accessToken,
      );

      if (!currentUserResult.response.ok) {
        throw new Error(t("auth.google.verifyFailed"));
      }

      /*
       * Reload the application so AuthProvider
       * restores the newly created session.
       */
      window.location.replace("/app");
    } catch (error) {
      console.error("Google authentication callback failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : t("auth.google.failedBody"),
      );
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              {t("auth.google.failedTitle")}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {t("auth.google.backToSignIn")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <h1 className="mt-6 text-xl font-semibold text-slate-900">
            {t("auth.google.signingIn")}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {t("auth.google.wait")}
          </p>
        </div>
      </div>
    </main>
  );
}
