import { Navigate, Route, Routes } from "react-router";

import LoginPage from "./pages/LoginPage.js";
import RegisterPage from "./pages/RegisterPage.js";
import AddTransactionPage from "./pages/AddTransactionPage.js";
import TransactionsPage from "./pages/TransactionsPage.js";
import ProtectedRoute from "./components/ProtectedRoute.js";
import DashboardPage from "./pages/DashboardPage.js";
import BudgetsPage from "./pages/BudgetsPage.js";
import AddBudgetPage from "./pages/AddBudgetPage.js";
import EditBudgetPage from "./pages/EditBudgetPage.js";
import GoalsPage from "./pages/GoalsPage.js";
import AddGoalPage from "./pages/AddGoalPage.js";
import EditGoalPage from "./pages/EditGoalPage.js";
import AddMoneyToGoalPage from "./pages/AddMoneyToGoalPage.js";
import ReportsPage from "./pages/ReportsPage.js";
import InsightsPage from "./pages/InsightsPage.js";
import SettingsPage from "./pages/SettingsPage.js";
import CoachPage from "./pages/CoachPage.js";
import LandingPage from "./pages/LandingPage.js";
import AppAccessGuard from "./components/AppAccessGuard.js";
import OnboardingAccessGuard from "./components/OnboardingAccessGuard.js";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.js";
import ResetPasswordPage from "./pages/ResetPasswordPage.js";
import GoogleAuthCallbackPage from "./pages/GoogleAuthCallbackPage.js";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingAccessGuard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppAccessGuard />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="transactions" element={<TransactionsPage />} />

        <Route path="transactions/add" element={<AddTransactionPage />} />

        <Route path="budgets" element={<BudgetsPage />} />

        <Route path="budgets/add" element={<AddBudgetPage />} />

        <Route path="budgets/edit/:id" element={<EditBudgetPage />} />

        <Route path="goals" element={<GoalsPage />} />

        <Route path="goals/add" element={<AddGoalPage />} />

        <Route path="goals/edit/:id" element={<EditGoalPage />} />

        <Route path="goals/add-money/:id" element={<AddMoneyToGoalPage />} />

        <Route path="reports" element={<ReportsPage />} />

        <Route path="insights" element={<InsightsPage />} />

        <Route path="coach" element={<CoachPage />} />

        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/auth/google/callback"
        element={<GoogleAuthCallbackPage />}
      />
    </Routes>
  );
}
