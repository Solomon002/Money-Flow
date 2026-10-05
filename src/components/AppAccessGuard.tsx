import { Navigate } from "react-router";

import AppShell from "./AppShell.js";
import { useAuth } from "../context/AuthContext.js";

export default function AppAccessGuard() {
  const {
    isLoading,
    onboardingLoading,
    isAuthenticated,
    onboardingPreferences,
  } = useAuth();

  if (isLoading || onboardingLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading MoneyFlow...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!onboardingPreferences) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppShell />;
}
