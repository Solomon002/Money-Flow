import { Navigate, Outlet } from "react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext.js";

type ProtectedRouteProps = {
  children?: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">{t("common.loadingApp")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}
