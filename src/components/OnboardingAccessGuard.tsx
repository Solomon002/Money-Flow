import { Navigate } from "react-router";
import { useTranslation } from "react-i18next";

import OnboardingPage from "../pages/OnboardingPage.js";
import { useAuth } from "../context/AuthContext.js";

export default function OnboardingAccessGuard() {
  const {
    isLoading,
    onboardingLoading,
    isAuthenticated,
    onboardingPreferences,
  } = useAuth();
  const { t } = useTranslation();

  if (isLoading || onboardingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">{t("common.loadingApp")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (onboardingPreferences) {
    return <Navigate to="/app" replace />;
  }

  return <OnboardingPage />;
}
