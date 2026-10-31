import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CalendarClock, Crown, Repeat, TrendingUp } from "lucide-react";

import { apiRequest } from "../api/client.js";
import { getProAccess } from "../api/subscription.js";
import { categoryLabel } from "../i18n/categories.js";
import { formatDate, formatMoney } from "../i18n/format.js";

type RecurringPayment = {
  name: string;
  type: "income" | "expense";
  categoryName: string | null;
  amountMinor: number;
  frequency: "weekly" | "monthly";
  lastDate: string;
  nextDate: string;
};

type Forecast = {
  daysElapsed: number;
  daysInMonth: number;
  spentSoFar: number;
  projectedSpending: number;
  projectedNet: number;
  budgetTotal: number | null;
};

type ProInsightsData = {
  recurring: RecurringPayment[];
  forecast: Forecast;
};

export default function ProInsights({ currencyCode }: { currencyCode: string }) {
  const { t } = useTranslation();
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [data, setData] = useState<ProInsightsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getProAccess()
      .then(async (pro) => {
        setIsPro(pro);

        if (pro) {
          const result = await apiRequest("/api/insights/pro", { method: "GET" });
          setData(result.data);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : t("insights.loadFailed")),
      );
  }, [t]);

  const money = (minor: number) => formatMoney(minor, currencyCode);

  if (isPro === null && !error) {
    return null;
  }

  if (isPro === false) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
        <div className="flex items-start gap-3">
          <Crown size={20} className="mt-0.5 shrink-0 text-emerald-700" />

          <div>
            <h2 className="font-semibold text-slate-900">{t("proInsights.teaserTitle")}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t("proInsights.teaserBody")}</p>
            <Link
              to="/app/pro"
              className="mt-3 inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              {t("pro.upgrade")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { forecast, recurring } = data;
  const overBudget =
    forecast.budgetTotal !== null && forecast.projectedSpending > forecast.budgetTotal;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("proInsights.forecastTitle")}</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Pro</span>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          {t("proInsights.dayOf", { day: forecast.daysElapsed, total: forecast.daysInMonth })}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">{t("proInsights.spentSoFar")}</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">{money(forecast.spentSoFar)}</dd>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs text-slate-500">{t("proInsights.projectedSpending")}</dt>
            <dd className="mt-1 text-lg font-bold text-slate-900">{money(forecast.projectedSpending)}</dd>
          </div>
        </dl>

        <p className={`mt-4 text-sm leading-6 ${forecast.projectedNet < 0 ? "text-red-700" : "text-slate-700"}`}>
          {forecast.projectedNet >= 0
            ? t("proInsights.endPositive", { amount: money(forecast.projectedNet) })
            : t("proInsights.endNegative", { amount: money(Math.abs(forecast.projectedNet)) })}
        </p>

        {forecast.budgetTotal !== null && (
          <p className={`mt-2 text-sm ${overBudget ? "font-medium text-amber-700" : "text-emerald-700"}`}>
            {overBudget
              ? t("proInsights.overBudget", { amount: money(forecast.projectedSpending - forecast.budgetTotal) })
              : t("proInsights.withinBudget", { amount: money(forecast.budgetTotal - forecast.projectedSpending) })}
          </p>
        )}

        <p className="mt-4 text-xs text-slate-400">{t("proInsights.forecastNote")}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Repeat size={18} className="text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">{t("proInsights.recurringTitle")}</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Pro</span>
        </div>

        <p className="mt-1 text-sm text-slate-500">{t("proInsights.recurringBody")}</p>

        {recurring.length === 0 ? (
          <p className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
            {t("proInsights.noRecurring")}
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100">
            {recurring.map((item) => (
              <li key={`${item.type}-${item.name}`} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarClock size={13} />
                    {t(`proInsights.${item.frequency}`)} · {t("proInsights.nextOn", { date: formatDate(item.nextDate) })}
                    {item.categoryName ? ` · ${categoryLabel(item.categoryName)}` : ""}
                  </p>
                </div>

                <p className={`shrink-0 text-sm font-semibold ${item.type === "income" ? "text-emerald-600" : "text-slate-900"}`}>
                  {item.type === "income" ? "+" : ""}
                  {money(item.amountMinor)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
