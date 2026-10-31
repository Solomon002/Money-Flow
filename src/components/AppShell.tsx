import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Target,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";

import NotificationBell from "./NotificationBell.js";
import SubscriptionExpiryBanner from "./SubscriptionExpiryBanner.js";
import LanguageSwitcher from "./LanguageSwitcher.js";
import UserMenu from "./UserMenu.js";
import { useAuth } from "../context/AuthContext.js";

export default function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navigation = [
    {
      to: "/app",
      label: t("nav.dashboard"),
      icon: <LayoutDashboard size={18} />,
      end: true,
    },
    {
      to: "/app/transactions",
      label: t("nav.transactions"),
      icon: <CreditCard size={18} />,
    },
    {
      to: "/app/budgets",
      label: t("nav.budgets"),
      icon: <Wallet size={18} />,
    },
    {
      to: "/app/goals",
      label: t("nav.goals"),
      icon: <Target size={18} />,
    },
    {
      to: "/app/reports",
      label: t("nav.reports"),
      icon: <TrendingUp size={18} />,
    },
    {
      to: "/app/insights",
      label: t("nav.insights"),
      icon: <ArrowUpRight size={18} />,
    },
    {
      to: "/app/coach",
      label: t("nav.coach"),
      icon: <CircleHelp size={18} />,
    },
    {
      to: "/app/settings",
      label: t("nav.settings"),
      icon: <Settings size={18} />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/app" className="flex items-center gap-2">
            <img
              src="/moneyflowlogo.png"
              alt="MoneyFlow"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <div className="hidden items-center gap-5 md:flex">
            <LanguageSwitcher />

            <NotificationBell />

            <UserMenu
              name={user?.name}
              email={user?.email}
              onSignOut={handleLogout}
            />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <NotificationBell />

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600"
              aria-label={t("nav.toggleMenu")}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <SubscriptionExpiryBanner />

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-[calc(100vh-4rem)] w-64 border-r border-slate-200 bg-white p-4 md:block">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white!"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            <LogOut size={18} />
            {t("nav.signOut")}
          </button>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-16 z-30 border-b border-slate-200 bg-white p-4 shadow-lg md:hidden">
            <nav className="space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? "bg-slate-900 text-white!"
                        : "text-slate-600 hover:bg-slate-100"
                    }`
                  }
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}

              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                <LogOut size={18} />
                {t("nav.signOut")}
              </button>

              <LanguageSwitcher className="mt-3 px-3" />
            </nav>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
