import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useProExpiry } from "../hooks/useProExpiry.js";

export default function SubscriptionExpiryBanner() {
  const {
    isLoading,
    isExpiringSoon,
    isInGracePeriod,
    daysUntilExpiry,
    daysSinceExpiry,
  } = useProExpiry();
  const { t } = useTranslation();

  if (isLoading) {
    return null;
  }

  if (!isExpiringSoon && !isInGracePeriod) {
    return null;
  }

  const isGrace = isInGracePeriod && !isExpiringSoon;

  const headline = isGrace
    ? daysSinceExpiry === 0
      ? t("proExpiry.expiredToday")
      : daysSinceExpiry === 1
        ? t("proExpiry.expiredYesterday")
        : t("proExpiry.expiredDaysAgo", { count: daysSinceExpiry })
    : daysUntilExpiry === 0
      ? t("proExpiry.expiresToday")
      : daysUntilExpiry === 1
        ? t("proExpiry.expiresTomorrow")
        : t("proExpiry.expiresInDays", { count: daysUntilExpiry });

  const body = isGrace
    ? t("proExpiry.graceBody")
    : t("proExpiry.renewBody");

  return (
    <div
      className={`border-b ${
        isGrace ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 rounded-lg p-2 ${
              isGrace
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <AlertTriangle size={18} />
          </div>

          <div>
            <p
              className={`text-sm font-semibold ${
                isGrace ? "text-red-900" : "text-amber-900"
              }`}
            >
              {headline}
            </p>

            <p
              className={`mt-0.5 text-sm ${
                isGrace ? "text-red-800" : "text-amber-800"
              }`}
            >
              {body}
            </p>
          </div>
        </div>

        <Link
          to="/app/pro"
          className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
            isGrace
              ? "bg-red-900 hover:bg-red-800"
              : "bg-amber-900 hover:bg-amber-800"
          }`}
        >
          {t("proExpiry.renew")}
        </Link>
      </div>
    </div>
  );
}
