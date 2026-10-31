import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../components/LanguageSwitcher.js";
import ScrollProgressBar from "../components/ScrollProgressBar.js";
import { Link } from "react-router";
import FadeLeft from "../components/animations/FadeLeft.js";
import FadeRight from "../components/animations/FadeRight.js";
import FadeUp from "../components/animations/FadeUp.js";
import Stagger from "../components/animations/Stagger.js";
import { apiRequest } from "../api/client.js";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Wallet,
  X,
  Sparkles,
  ArrowDownLeft,
} from "lucide-react";

type PreviewTab = "dashboard" | "transactions" | "budgets" | "goals";

const PREVIEW_TABS: PreviewTab[] = [
  "dashboard",
  "transactions",
  "budgets",
  "goals",
];

// t("landing.faq.<key>.question") / t("landing.faq.<key>.answer")
const FAQ_KEYS = ["uses", "skills", "realMoney", "goals", "coach"];

/*
 * Demo figures on the landing page are written in naira. Other languages
 * show a plausible amount in a currency their visitors use instead.
 */
const DEMO_CURRENCY: Record<string, { currency: string; factor: number }> = {
  en: { currency: "NGN", factor: 1 },
  fr: { currency: "EUR", factor: 1 / 400 },
  de: { currency: "EUR", factor: 1 / 400 },
  es: { currency: "EUR", factor: 1 / 400 },
  pt: { currency: "BRL", factor: 1 / 100 },
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();

  function demoMoney(ngn: number, compact = false) {
    const language = i18n.resolvedLanguage ?? "en";
    const { currency, factor } = DEMO_CURRENCY[language] ?? DEMO_CURRENCY.en;

    return new Intl.NumberFormat(language, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: compact ? "compact" : "standard",
    }).format(Math.round((ngn * factor) / 10) * 10);
  }

  const faqs = FAQ_KEYS.map((key) => ({
    question: t(`landing.faq.${key}.question`),
    answer: t(`landing.faq.${key}.answer`),
  }));
  const [activeTab, setActiveTab] = useState<PreviewTab>("dashboard");

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [feedbackError, setFeedbackError] = useState("");

  const [feedbackType, setFeedbackType] = useState("General feedback");

  const [feedback, setFeedback] = useState("");

  const [feedbackEmail, setFeedbackEmail] = useState("");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!feedback.trim()) {
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackError("");

    try {
      await apiRequest("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          feedbackType,
          feedback,
          email: feedbackEmail,
        }),
      });

      setFeedbackSent(true);
    } catch (error) {
      console.error("Feedback submission failed:", error);

      setFeedbackError(
        error instanceof Error
          ? error.message
          : t("landing.feedback.failed"),
      );
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function closeFeedback() {
    setIsFeedbackOpen(false);

    setTimeout(() => {
      setFeedbackSent(false);
      setFeedbackSubmitting(false);
      setFeedbackError("");
      setFeedback("");
      setFeedbackEmail("");
      setFeedbackType("General feedback");
    }, 200);
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  const activePreview = {
    label: t(`landing.preview.${activeTab}.label`),
    title: t(`landing.preview.${activeTab}.title`),
    description: t(`landing.preview.${activeTab}.description`),
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <ScrollProgressBar />

      {/* Navigation */}
      {/* Navigation */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5"
            onClick={closeMobileMenu}
          >
            <img
              src="/moneyflowlogo.png"
              alt="MoneyFlow"
              className="h-12 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {t("landing.nav.features")}
            </a>

            <a
              href="#coach"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {t("nav.coach")}
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {t("landing.nav.howItWorks")}
            </a>

            <a
              href="#questions"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              {t("landing.nav.questions")}
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <LanguageSwitcher />

            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
            >
              {t("auth.login.submit")}
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white! transition hover:bg-slate-800"
            >
              {t("landing.getStarted")}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:hidden"
            aria-label={isMobileMenuOpen ? t("landing.nav.closeMenu") : t("landing.nav.openMenu")}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {/* Mobile navigation */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white md:hidden">
            <nav className="mx-auto flex max-w-7xl flex-col px-6 py-4">
              <a
                href="#features"
                onClick={closeMobileMenu}
                className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                {t("landing.nav.features")}
              </a>

              <a
                href="#coach"
                onClick={closeMobileMenu}
                className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                {t("nav.coach")}
              </a>

              <a
                href="#how-it-works"
                onClick={closeMobileMenu}
                className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                {t("landing.nav.howItWorks")}
              </a>

              <a
                href="#questions"
                onClick={closeMobileMenu}
                className="py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                {t("landing.nav.questions")}
              </a>

              <LanguageSwitcher className="py-3.5" />

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {t("auth.login.submit")}
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white! transition hover:bg-slate-800"
                >
                  {t("landing.getStarted")}
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-150 bg-linear-to-b from-emerald-50 via-slate-50 to-slate-50" />

        <div className="mx-auto max-w-7xl px-6 pb-20 pt-28 lg:px-8 lg:pb-28 lg:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <FadeUp>
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-sm font-medium text-emerald-700 shadow-sm">
                  <Sparkles size={16} className="text-emerald-500" />
                  {t("landing.hero.badge")}
                </div>

                <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                  {t("landing.hero.title1")}
                  <span className="block text-emerald-600">
                    {t("landing.hero.title2")}
                  </span>
                </h1>

                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                  {t("landing.hero.body")}
                </p>

                <div className="mt-9 flex flex-wrap gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white! shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    {t("landing.getStarted")}
                    <ArrowRight size={17} />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {t("landing.hero.explore")}
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    {t("landing.hero.track")}
                  </span>

                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    {t("landing.hero.budgets")}
                  </span>

                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    {t("landing.hero.goals")}
                  </span>
                </div>
              </div>
            </FadeUp>

            {/* Hero product preview */}
            <FadeRight>
              <div className="relative">
                <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-emerald-200/30 blur-3xl" />

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        MoneyFlow
                      </p>

                      <p className="text-sm font-semibold text-slate-900">
                        {t("landing.mock.overview")}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                      <Wallet size={17} className="text-emerald-700" />
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl bg-slate-950 p-5 text-white">
                      <p className="text-sm text-slate-400">{t("dashboard.totalBalance")}</p>

                      <p className="mt-2 text-3xl font-bold">{demoMoney(845000)}</p>

                      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                        <TrendingUp size={15} />
                        {t("landing.mock.glance")}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <ArrowRight size={15} className="-rotate-45" />

                          <span className="text-xs">{t("common.income")}</span>
                        </div>

                        <p className="mt-2 text-lg font-bold">{demoMoney(420000)}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <ArrowRight size={15} className="rotate-135" />

                          <span className="text-xs">{t("common.expenses")}</span>
                        </div>

                        <p className="mt-2 text-lg font-bold">{demoMoney(185000)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {t("dashboard.spendingOverview")}
                          </p>

                          <p className="text-xs text-slate-500">{t("reports.periods.thisMonth")}</p>
                        </div>

                        <BarChart3 size={18} className="text-emerald-600" />
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          [t("categories.food"), demoMoney(60000, true), "70%"],
                          [t("categories.transport"), demoMoney(35000, true), "42%"],
                          [t("categories.shopping"), demoMoney(25000, true), "30%"],
                        ].map(([name, amount, width]) => (
                          <div key={name}>
                            <div className="mb-1 flex justify-between text-xs">
                              <span>{name}</span>

                              <span className="text-slate-500">{amount}</span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </FadeRight>
          </div>
        </div>
      </section>

      {/* Core message */}
      <section
        id="features"
        className="scroll-mt-20 border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
            <FadeLeft>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                  MoneyFlow
                </p>

                <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                  {t("landing.core.title")}
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  {t("landing.core.body")}
                </p>
              </div>
            </FadeLeft>

            <Stagger className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-7">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                    01
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {t("landing.core.understand")}
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      {t("landing.core.understandBody")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-7">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                    02
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {t("landing.core.control")}
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      {t("landing.core.controlBody")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-7">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-bold text-emerald-700">
                    03
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-slate-950">
                      {t("landing.core.plan")}
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      {t("landing.core.planBody")}
                    </p>
                  </div>
                </div>
              </div>
            </Stagger>
          </div>
        </div>
      </section>

      {/* Product features */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-16">
            <FadeUp>
              <div className="lg:sticky lg:top-28">
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                  {t("landing.features.eyebrow")}
                </p>

                <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {t("landing.features.title")}
                </h2>

                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                  {t("landing.features.body")}
                </p>
              </div>
            </FadeUp>

            <Stagger className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <ArrowDownLeft size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("nav.transactions")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.transactions")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Wallet size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("nav.budgets")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.budgets")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Target size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("landing.features.goalsTitle")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.goals")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <BarChart3 size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("nav.reports")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.reports")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <TrendingUp size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("nav.insights")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.insights")}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Sparkles size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  {t("nav.coach")}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("landing.features.coach")}
                </p>
              </div>
            </Stagger>
          </div>
        </div>
      </section>

      {/* MoneyFlow Coach */}
      <section
        id="coach"
        className="scroll-mt-20 overflow-hidden bg-slate-950 text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
            <FadeLeft>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2 text-sm font-medium text-emerald-300">
                  <MessageCircle size={15} />
                  {t("landing.coach.eyebrow")}
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
                  {t("landing.coach.title1")}
                  <span className="block text-emerald-400">{t("landing.coach.title2")}</span>
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                  {t("landing.coach.body")}
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    t("landing.coach.q1"),
                    t("landing.coach.q2"),
                    t("landing.coach.q3"),
                    t("landing.coach.q4"),
                  ].map((question) => (
                    <div
                      key={question}
                      className="flex items-center gap-3 text-sm text-slate-300"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/10">
                        <Check size={14} className="text-emerald-400" />
                      </div>

                      {question}
                    </div>
                  ))}
                </div>

                <p className="mt-8 text-sm text-slate-500">
                  {t("landing.coach.disclaimer")}
                </p>
              </div>
            </FadeLeft>

            {/* Coach conversation preview */}
            <FadeRight>
              <div className="relative">
                <div className="absolute -inset-8 -z-10 rounded-[4rem] bg-emerald-500/10 blur-3xl" />

                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
                  <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500">
                      <MessageCircle size={19} className="text-white" />
                    </div>

                    <div>
                      <p className="font-semibold">MoneyFlow Coach</p>

                      <p className="text-xs text-slate-500">
                        {t("landing.coach.contextExplained")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 py-5">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-3 text-sm leading-6 text-white">
                      {t("landing.coach.demoQ1")}
                    </div>

                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-4 text-sm leading-6 text-slate-200">
                      {t("landing.coach.demoA1")}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-900 p-3">
                          <p className="text-xs text-slate-500">{t("categories.education")}</p>

                          <p className="mt-1 font-semibold text-white">
                            {demoMoney(115000)}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-900 p-3">
                          <p className="text-xs text-slate-500">{t("categories.health")}</p>

                          <p className="mt-1 font-semibold text-white">
                            {demoMoney(80000)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-3 text-sm leading-6 text-white">
                      {t("landing.coach.demoQ2")}
                    </div>

                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-4 text-sm leading-6 text-slate-200">
                      {t("landing.coach.demoA2", {
                        saved: demoMoney(90000),
                        target: demoMoney(150000),
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-600">
                      {t("coach.placeholder")}
                    </span>

                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
                      <ArrowRight size={15} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </FadeRight>
          </div>
        </div>
      </section>

      {/* Free / no real money */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16">
            <FadeLeft>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                  {t("landing.free.eyebrow")}
                </p>

                <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {t("landing.free.title")}
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  {t("landing.free.body1")}
                </p>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  {t("landing.free.body2")}
                </p>

                <div className="mt-8">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white! transition hover:bg-slate-800"
                  >
                    {t("landing.free.cta")}
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </FadeLeft>

            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <ShieldCheck size={20} className="text-emerald-700" />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">{t("landing.free.point1Title")}</p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t("landing.free.point1Body")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <Check size={20} className="text-emerald-700" />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {t("landing.free.point2Title")}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t("landing.free.point2Body")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2 lg:col-span-1">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <Wallet size={20} className="text-emerald-700" />
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">
                      {t("landing.free.point3Title")}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t("landing.free.point3Body")}
                    </p>
                  </div>
                </div>
              </div>
            </Stagger>
          </div>
        </div>
      </section>

      {/* Interactive preview */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <FadeLeft>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                  {t("landing.preview.eyebrow")}
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  {t("landing.preview.title")}
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-600">
                  {t("landing.preview.body")}
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {PREVIEW_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
                        activeTab === tab
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {t(`landing.preview.${tab}.label`)}
                    </button>
                  ))}
                </div>
              </div>
            </FadeLeft>

            <FadeRight>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-xs font-medium text-slate-500">
                      {activePreview.label}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {activePreview.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {activePreview.description}
                    </p>
                  </div>

                  {activeTab === "dashboard" && (
                    <div className="space-y-4 p-5">
                      <div className="rounded-2xl bg-slate-950 p-5 text-white">
                        <p className="text-xs text-slate-400">{t("dashboard.totalBalance")}</p>

                        <p className="mt-2 text-3xl font-bold">{demoMoney(845000)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs text-slate-500">{t("common.income")}</p>

                          <p className="mt-1 font-bold">{demoMoney(420000)}</p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">{t("common.expenses")}</p>

                          <p className="mt-1 font-bold">{demoMoney(185000)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "transactions" && (
                    <div className="space-y-3 p-5">
                      {[
                        [t("landing.mock.groceries"), demoMoney(18500)],
                        [t("categories.transport"), demoMoney(7000)],
                        [t("landing.mock.freelanceIncome"), `+${demoMoney(85000)}`],
                        [t("landing.mock.internet"), demoMoney(12000)],
                      ].map(([name, amount]) => (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                              <CreditCard
                                size={16}
                                className="text-slate-600"
                              />
                            </div>

                            <span className="text-sm font-medium">{name}</span>
                          </div>

                          <span className="text-sm font-semibold">
                            {amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "budgets" && (
                    <div className="space-y-5 p-5">
                      {[
                        [t("categories.food"), demoMoney(60000), "75%"],
                        [t("categories.transport"), demoMoney(35000), "55%"],
                        [t("categories.entertainment"), demoMoney(18000), "36%"],
                      ].map(([name, amount, progress]) => (
                        <div key={name}>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{name}</span>

                            <span className="text-slate-500">{amount}</span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: progress,
                              }}
                            />
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {progress} used
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "goals" && (
                    <div className="p-5">
                      <div className="rounded-2xl border border-slate-200 p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-slate-500">
                              {t("landing.mock.financialGoal")}
                            </p>

                            <h4 className="mt-1 text-lg font-bold">
                              {t("landing.mock.newLaptop")}
                            </h4>
                          </div>

                          <Target size={21} className="text-emerald-600" />
                        </div>

                        <div className="mt-6">
                          <div className="flex justify-between text-sm">
                            <span>{t("landing.mock.saved", { amount: demoMoney(90000) })}</span>
                            <span>{demoMoney(150000)}</span>
                          </div>

                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-[60%] rounded-full bg-emerald-500" />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {t("landing.mock.ofGoal")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </FadeRight>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 bg-slate-950 text-white"
      >
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-28">
          <FadeLeft>
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
                {t("landing.nav.howItWorks")}
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                {t("landing.how.title")}
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-400">
                {t("landing.how.body")}
              </p>
            </div>
          </FadeLeft>

          <Stagger className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: t("landing.how.step1"),
                text: t("landing.how.step1Body"),
              },
              {
                number: "02",
                title: t("landing.how.step2"),
                text: t("landing.how.step2Body"),
              },
              {
                number: "03",
                title: t("landing.how.step3"),
                text: t("landing.how.step3Body"),
              },
              {
                number: "04",
                title: t("landing.how.step4"),
                text: t("landing.how.step4Body"),
              },
            ].map((step) => (
              <div key={step.number}>
                <span className="text-sm font-bold text-emerald-400">
                  {step.number}
                </span>

                <div className="my-5 h-px bg-slate-800" />

                <h3 className="text-xl font-bold">{step.title}</h3>

                <p className="mt-3 leading-7 text-slate-400">{step.text}</p>
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Customer statement */}
      <section className="bg-white">
        <FadeUp>
          <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:py-28">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
              <LayoutDashboard size={25} className="text-emerald-700" />
            </div>

            <h2 className="mt-7 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {t("landing.statement.title")}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              {t("landing.statement.body")}
            </p>
          </div>
        </FadeUp>
      </section>

      {/* Feedback */}
      <section className="border-y border-slate-200 bg-emerald-50">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <FadeLeft>
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600">
                  <MessageCircle size={21} className="text-white" />
                </div>

                <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">
                  {t("landing.feedback.ctaTitle")}
                </h2>

                <p className="mt-3 text-lg leading-8 text-slate-600">
                  {t("landing.feedback.ctaBody")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {t("landing.feedback.cta")}
                <ArrowRight size={17} />
              </button>
            </div>
          </FadeLeft>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="questions"
        className="scroll-mt-20 border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto max-w-3xl px-6 py-20 lg:py-28">
          <FadeUp>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                {t("landing.nav.questions")}
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                {t("landing.faqTitle")}
              </h2>
            </div>
          </FadeUp>

          <Stagger className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;

              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="font-semibold text-slate-900">
                      {faq.question}
                    </span>

                    <ChevronDown
                      size={19}
                      className={`shrink-0 text-slate-400 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="border-t border-slate-100 px-5 pb-5 pt-4 sm:px-6">
                      <p className="leading-7 text-slate-600">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </Stagger>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-emerald-600">
        <FadeUp>
          <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:py-24">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {t("landing.final.title")}
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-emerald-50">
              {t("landing.final.body")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                {t("landing.getStarted")}
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center rounded-xl border border-emerald-400 bg-emerald-700/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                {t("auth.login.submit")}
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="bg-white text-slate-600">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <img
              src="/moneyflowlogo.png"
              alt="MoneyFlow"
              className="h-10 w-auto object-contain"
            />

            <p className="mt-2 text-xs text-slate-500">
              {t("landing.footerTagline")}
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="transition hover:text-white">
              {t("landing.nav.features")}
            </a>

            <a href="#how-it-works" className="transition hover:text-white">
              {t("landing.nav.howItWorks")}
            </a>

            <a href="#questions" className="transition hover:text-white">
              {t("landing.nav.questions")}
            </a>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} MoneyFlow
          </p>
        </div>
      </footer>

      {/* Feedback modal */}
      {isFeedbackOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFeedback();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  {t("landing.feedback.title")}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {t("landing.feedback.subtitle")}
                </p>
              </div>

              <button
                type="button"
                onClick={closeFeedback}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label={t("common.close")}
              >
                <X size={19} />
              </button>
            </div>

            {feedbackSent ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                  <Check size={27} className="text-emerald-600" />
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-950">
                  {t("landing.feedback.thanks")}
                </h3>

                <p className="mx-auto mt-3 max-w-sm leading-7 text-slate-600">
                  {t("landing.feedback.thanksBody")}
                </p>

                <button
                  type="button"
                  onClick={closeFeedback}
                  className="mt-7 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {t("landing.feedback.done")}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleFeedbackSubmit}
                className="space-y-5 px-6 py-6"
              >
                <div>
                  <label
                    htmlFor="feedbackType"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {t("landing.feedback.type")}
                  </label>

                  <select
                    id="feedbackType"
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="General feedback">{t("landing.feedback.types.general")}</option>

                    <option value="Something I like">{t("landing.feedback.types.like")}</option>

                    <option value="Something to improve">{t("landing.feedback.types.improve")}</option>

                    <option value="Feature request">{t("landing.feedback.types.feature")}</option>

                    <option value="Bug or problem">{t("landing.feedback.types.bug")}</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="feedback"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {t("landing.feedback.label")}
                  </label>

                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    required
                    rows={5}
                    placeholder={t("landing.feedback.placeholder")}
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedbackEmail"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    {t("auth.email")}
                    <span className="ml-1 font-normal text-slate-400">
                      optional
                    </span>
                  </label>

                  <input
                    id="feedbackEmail"
                    type="email"
                    value={feedbackEmail}
                    onChange={(event) => setFeedbackEmail(event.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {t("landing.feedback.emailHint")}
                  </p>
                </div>

                {feedbackError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {feedbackError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} />

                  {feedbackSubmitting ? t("landing.feedback.sending") : t("landing.feedback.send")}
                </button>

                <p className="text-center text-xs leading-5 text-slate-400">
                  {t("landing.feedback.footer")}
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
