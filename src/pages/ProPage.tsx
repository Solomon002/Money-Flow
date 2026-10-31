import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatMoney } from "../i18n/format.js";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Crown,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import {
  getSubscription,
  getSubscriptionPayments,
  initializeProSubscription,
  verifyProSubscription,
  type Subscription,
  type SubscriptionPayment,
} from "../api/subscription.js";

// Labels: t("pro.features.<key>")
const proFeatures = [
  "advancedReports",
  "spendingBreakdowns",
  "topSpending",
  "budgetPerformance",
  "deeperInsights",
  "coachInsights",
  "history",
  "exports",
];

const freeFeatures = [
  "tracking",
  "budgetsGoals",
  "dashboard",
  "basicReports",
  "basicNotifications",
];

const CHANNEL_LABELS: Record<string, string> = {
  ussd: "USSD",
  payattitude: "PayAttitude",
  opay: "OPay",
  zap: "Zap",
};

function formatPaymentDate(value: string) {
  return formatDate(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState("");

  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");

  const isPro =
    subscription?.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "cancelled");

  useEffect(() => {
    async function loadSubscription() {
      try {
        setSubscriptionLoading(true);
        setError("");

        const response = await getSubscription();

        if (!response.response.ok) {
          throw new Error(
            response.data.message || t("pro.loadFailed"),
          );
        }

        setSubscription(response.data.subscription);
      } catch (err) {
        console.error("Loading subscription failed:", err);

        setError(
          err instanceof Error ? err.message : t("pro.loadFailed"),
        );
      } finally {
        setSubscriptionLoading(false);
      }
    }

    loadSubscription();
  }, []);

  useEffect(() => {
    async function loadPayments() {
      try {
        setPaymentsLoading(true);
        setPaymentsError("");

        const response = await getSubscriptionPayments();

        if (!response.response.ok) {
          throw new Error(
            response.data.message || t("pro.paymentsFailed"),
          );
        }

        setPayments(response.data.payments);
      } catch (err) {
        console.error("Loading payment history failed:", err);

        setPaymentsError(
          err instanceof Error ? err.message : t("pro.paymentsFailed"),
        );
      } finally {
        setPaymentsLoading(false);
      }
    }

    loadPayments();
  }, []);

  useEffect(() => {
    const reference = searchParams.get("reference");

    if (!reference || isPro) {
      return;
    }

    const paymentReference = reference;

    async function verifyPayment() {
      try {
        setVerifyingPayment(true);
        setError("");

        const response = await verifyProSubscription(paymentReference);

        if (!response.response.ok) {
          throw new Error(
            response.data.message || t("pro.verifyFailed"),
          );
        }

        if (response.data.subscription) {
          setSubscription(response.data.subscription);
        }

        const updatedResponse = await getSubscription();

        if (!updatedResponse.response.ok) {
          throw new Error(
            updatedResponse.data.message ||
              "Unable to refresh your Pro subscription",
          );
        }

        setSubscription(updatedResponse.data.subscription);

        setSearchParams({}, { replace: true });

        const paymentsResponse = await getSubscriptionPayments();

        if (paymentsResponse.response.ok) {
          setPayments(paymentsResponse.data.payments);
        }
      } catch (err) {
        console.error("Pro payment verification failed:", err);

        setError(
          err instanceof Error
            ? err.message
            : t("pro.verifyFailed"),
        );
      } finally {
        setVerifyingPayment(false);
      }
    }

    verifyPayment();
  }, [isPro, searchParams, setSearchParams]);

  async function handleUpgrade() {
    try {
      setLoading(true);
      setError("");

      const response = await initializeProSubscription();

      if (!response.response.ok) {
        throw new Error(
          response.data.message || t("pro.checkoutFailed"),
        );
      }

      const authorizationUrl = response.data.checkout?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(t("pro.checkoutFailed"));
      }

      window.location.href = authorizationUrl;
    } catch (err) {
      console.error("Starting Pro checkout failed:", err);

      setError(
        err instanceof Error ? err.message : t("pro.checkoutFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  if (subscriptionLoading || verifyingPayment) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

            <p className="mt-4 text-sm font-medium text-slate-700">
              {verifyingPayment
                ? t("pro.verifying")
                : t("pro.loading")}
            </p>

            {verifyingPayment && (
              <p className="mt-1 text-xs text-slate-500">
                {t("pro.verifyingBody")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate("/app/settings")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          {t("pro.backToSettings")}
        </button>

        {/* Header */}
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
            <Crown size={16} />
            MoneyFlow Pro
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {t("pro.headline")}
          </h1>

          <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
            {t("pro.subheadline")}
          </p>
        </div>

        {/* Active Pro */}
        {isPro && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Crown size={24} />
              </div>

              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  MoneyFlow Pro
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {t("pro.activeTitle")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("pro.activeBody")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Free */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {t("pro.freeName")}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-900">{t("pro.free")}</h2>
              </div>

              <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                {t("pro.coreFeatures")}
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {t("pro.freeBody")}
            </p>

            <div className="mt-6 space-y-3">
              {freeFeatures.map((feature) => (
                <div
                  key={feature}
                  className="flex items-start gap-3 text-sm text-slate-700"
                >
                  <Check
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />
                  <span>{t(`pro.features.${feature}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 p-6 text-white shadow-xl sm:p-8">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Sparkles size={16} />
                    MoneyFlow Pro
                  </div>

                  <h2 className="mt-3 text-3xl font-bold">
                    {isPro ? t("pro.youreIn") : t("pro.goDeeper")}
                  </h2>
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-900">
                  <Crown size={14} />
                  PRO
                </div>
              </div>

              <p className="relative mt-4 text-sm leading-6 text-slate-300">
                {t("pro.proBody")}
              </p>

              <div className="relative mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-slate-300">
                  {t("pro.includes")}
                </p>

                <div className="mt-4 space-y-3">
                  {proFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 text-sm text-white"
                    >
                      <Check
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-400"
                      />
                      <span>{t(`pro.features.${feature}`)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative mt-6">
                {isPro ? (
                  <button
                    type="button"
                    onClick={() => navigate("/app/reports")}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    {t("pro.viewReports")}
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleUpgrade}
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? t("pro.openingCheckout") : t("pro.upgrade")}
                      {!loading && <ArrowRight size={18} />}
                    </button>

                    {error && (
                      <p className="mt-3 text-center text-xs text-red-300">
                        {error}
                      </p>
                    )}

                    <p className="mt-3 text-center text-xs text-slate-400">
                      {t("pro.securePayment")}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment history */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Receipt size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t("pro.paymentHistory")}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t("pro.paymentHistoryBody")}
              </p>
            </div>
          </div>

          {paymentsLoading ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                {t("pro.loadingPayments")}
              </p>
            </div>
          ) : paymentsError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {paymentsError}
            </div>
          ) : payments.length === 0 ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-500">
                {t("pro.noPayments")}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.4fr] sm:gap-4">
                <span>{t("common.date")}</span>
                <span>{t("common.amount")}</span>
                <span>{t("pro.channel")}</span>
                <span>{t("goals.form.status")}</span>
                <span>{t("pro.reference")}</span>
              </div>

              <div className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="grid gap-2 px-4 py-4 text-sm sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.4fr] sm:gap-4 sm:py-3"
                  >
                    <span className="font-medium text-slate-900">
                      {formatPaymentDate(payment.paid_at)}
                    </span>

                    <span className="text-slate-700">
                      {formatMoney(payment.amount_minor, payment.currency)}
                    </span>

                    <span className="text-slate-700">
                      {payment.channel
                        ? (CHANNEL_LABELS[payment.channel] ??
                          t(`pro.channels.${payment.channel}`, {
                            defaultValue: payment.channel,
                          }))
                        : "—"}
                    </span>

                    <span>
                      {payment.status === "success" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          {t("pro.success")}
                        </span>
                      ) : payment.status === "failed" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {t("pro.failed")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {payment.status}
                        </span>
                      )}
                    </span>

                    <span className="break-all font-mono text-xs text-slate-500">
                      {payment.provider_reference}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Value section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <Sparkles size={20} />
              </div>

              <h3 className="font-semibold text-slate-900">{t("pro.deeperInsights")}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("pro.deeperInsightsBody")}
              </p>
            </div>

            <div>
              <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <ShieldCheck size={20} />
              </div>

              <h3 className="font-semibold text-slate-900">
                {t("pro.builtAroundData")}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("pro.builtAroundDataBody")}
              </p>
            </div>

            <div>
              <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-2.5 text-slate-700">
                <Crown size={20} />
              </div>

              <h3 className="font-semibold text-slate-900">{t("pro.moreControl")}</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {t("pro.moreControlBody")}
              </p>
            </div>
          </div>
        </div>

        {/* Footer message */}
        <div className="pb-4 text-center">
          <p className="text-sm text-slate-500">
            {t("pro.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
