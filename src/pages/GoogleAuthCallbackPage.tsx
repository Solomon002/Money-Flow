import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { exchangeGoogleAuthCode, getCurrentUser } from "../api/auth.js";
import { saveAuthTokens } from "../api/authStorage.js";

export default function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [error, setError] = useState("");

  useEffect(() => {
    handleGoogleCallback();
  }, []);

  async function handleGoogleCallback() {
    const code = searchParams.get("code");

    if (!code) {
      setError("Google sign-in could not be completed. Please try again.");
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
          exchangeResult.data.message || "Unable to complete Google sign-in.",
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
        throw new Error("Unable to verify your MoneyFlow account.");
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
          : "Google sign-in could not be completed. Please try again.",
      );
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Google sign-in failed
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to sign in
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
            Signing you in
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Please wait while we finish setting up your MoneyFlow session.
          </p>
        </div>
      </div>
    </main>
  );
}
