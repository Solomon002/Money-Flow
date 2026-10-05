import { useState } from "react";
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

const previewData: Record<
  PreviewTab,
  {
    label: string;
    title: string;
    description: string;
  }
> = {
  dashboard: {
    label: "Dashboard",
    title: "See your financial picture at a glance.",
    description:
      "Understand your income, expenses, budgets, and goals without digging through spreadsheets.",
  },
  transactions: {
    label: "Transactions",
    title: "Know where your money is going.",
    description:
      "Keep your income and expenses organized so you always know what you spent and why.",
  },
  budgets: {
    label: "Budgets",
    title: "Stay ahead of your spending.",
    description:
      "Set monthly limits and see how much you've used before your spending gets out of hand.",
  },
  goals: {
    label: "Goals",
    title: "Turn plans into progress.",
    description:
      "Set financial goals, track your progress, and see how much more you need to reach them.",
  },
};

const faqs = [
  {
    question: "What can I use MoneyFlow for?",
    answer:
      "MoneyFlow helps you track income and expenses, manage budgets, set financial goals, understand spending patterns, and make better day-to-day financial decisions.",
  },
  {
    question: "Do I need to be good with money to use MoneyFlow?",
    answer:
      "Not at all. MoneyFlow is designed to make your finances easier to understand. You can start with the basics and build better habits as you go.",
  },
  {
    question: "Do I need to put real money into MoneyFlow?",
    answer:
      "No. MoneyFlow does not require you to deposit or transfer real money. You use the app to track and understand your finances without putting your money at risk.",
  },
  {
    question: "Can I create savings goals?",
    answer:
      "Yes. You can create goals for things you want to save for, set a target amount and date, add money toward the goal, and track your progress.",
  },
  {
    question: "What is MoneyFlow Coach?",
    answer:
      "MoneyFlow Coach is an Artificial Intelligence (AI) assistant that can answer questions using your MoneyFlow financial context, helping you understand your spending and make more informed decisions.",
  },
];

export default function LandingPage() {
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
          : "Unable to submit feedback. Please try again.",
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

  const activePreview = previewData[activeTab];

  return (
    <main className="min-h-screen overflow-hidden bg-slate-50 text-slate-900">
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
              Features
            </a>

            <a
              href="#coach"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              MoneyFlow Coach
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              How it works
            </a>

            <a
              href="#questions"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Questions
            </a>
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 transition hover:text-slate-900"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white! transition hover:bg-slate-800"
            >
              Get started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-100 md:hidden"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
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
                Features
              </a>

              <a
                href="#coach"
                onClick={closeMobileMenu}
                className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                MoneyFlow Coach
              </a>

              <a
                href="#how-it-works"
                onClick={closeMobileMenu}
                className="border-b border-slate-100 py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                How it works
              </a>

              <a
                href="#questions"
                onClick={closeMobileMenu}
                className="py-3.5 text-sm font-medium text-slate-700 transition hover:text-slate-950"
              >
                Questions
              </a>

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Sign in
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white! transition hover:bg-slate-800"
                >
                  Get started
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
                  <Sparkles size={16} className="text-emerald-500" />A clearer
                  way to manage your money
                </div>

                <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                  Understand your money.
                  <span className="block text-emerald-600">
                    Control your future.
                  </span>
                </h1>

                <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                  MoneyFlow helps you see where your money goes, stay in control
                  of your spending, plan financial goals, and make better
                  decisions every day.
                </p>

                <div className="mt-9 flex flex-wrap gap-4">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white! shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
                  >
                    Get started
                    <ArrowRight size={17} />
                  </Link>

                  <a
                    href="#features"
                    className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Explore MoneyFlow
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    Track your money
                  </span>

                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    Build better budgets
                  </span>

                  <span className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    Reach your goals
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
                        Your financial overview
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                      <Wallet size={17} className="text-emerald-700" />
                    </div>
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="rounded-2xl bg-slate-950 p-5 text-white">
                      <p className="text-sm text-slate-400">Total balance</p>

                      <p className="mt-2 text-3xl font-bold">₦845,000</p>

                      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                        <TrendingUp size={15} />
                        Your money at a glance
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <ArrowRight size={15} className="-rotate-45" />

                          <span className="text-xs">Income</span>
                        </div>

                        <p className="mt-2 text-lg font-bold">₦420,000</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <ArrowRight size={15} className="rotate-135" />

                          <span className="text-xs">Expenses</span>
                        </div>

                        <p className="mt-2 text-lg font-bold">₦185,000</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            Spending overview
                          </p>

                          <p className="text-xs text-slate-500">This month</p>
                        </div>

                        <BarChart3 size={18} className="text-emerald-600" />
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          ["Food", "₦60k", "70%"],
                          ["Transport", "₦35k", "42%"],
                          ["Shopping", "₦25k", "30%"],
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
                  Your money should be easier to understand.
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                  You shouldn't need a spreadsheet full of numbers to understand
                  what's happening with your money. MoneyFlow brings the
                  important parts together in one place.
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
                      Understand
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      See where your money goes, compare your spending, and
                      understand your financial patterns.
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
                      Control
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      Create budgets, monitor your limits, and get alerts before
                      your spending gets away from you.
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
                      Plan
                    </h3>

                    <p className="mt-2 text-base leading-7 text-slate-600">
                      Set meaningful financial goals and turn them into progress
                      you can actually see.
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
                  Everything in one place
                </p>

                <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Tools that help you make better money decisions.
                </h2>

                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                  From everyday spending to long-term goals, MoneyFlow gives you
                  a clearer picture of your financial life.
                </p>
              </div>
            </FadeUp>

            <Stagger className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <ArrowDownLeft size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  Transactions
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Record income and expenses and keep your financial activity
                  organized.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Wallet size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  Budgets
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Set monthly spending limits and know how much you have left.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Target size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  Financial goals
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Save toward the things that matter to you and track your
                  progress.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <BarChart3 size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  Reports
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Turn your financial activity into useful summaries and trends.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <TrendingUp size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  Insights
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Discover spending patterns and changes that are easy to miss.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                  <Sparkles size={20} className="text-emerald-700" />
                </div>

                <h3 className="mt-5 text-lg font-semibold text-slate-950">
                  MoneyFlow Coach
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ask questions about your finances and get helpful,
                  personalized context.
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
                  Meet MoneyFlow Coach
                </div>

                <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-5xl">
                  Don't just track your money.
                  <span className="block text-emerald-400">Talk to it.</span>
                </h2>

                <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                  MoneyFlow Coach is your Artificial Intelligence (AI) financial
                  companion. Ask questions about your spending, budgets, goals,
                  and financial activity and get answers based on your MoneyFlow
                  context.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    "Where did I spend the most this month?",
                    "Why did my spending increase?",
                    "How can I reach my goal faster?",
                    "How am I doing financially this month?",
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
                  MoneyFlow Coach is designed to help you understand your
                  financial information. It does not replace professional
                  financial advice.
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
                        Your financial context, explained
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5 py-5">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-3 text-sm leading-6 text-white">
                      Why did my spending increase this month?
                    </div>

                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-4 text-sm leading-6 text-slate-200">
                      Your spending increased compared with last month.
                      Education and Health were the biggest contributors to the
                      change.
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-900 p-3">
                          <p className="text-xs text-slate-500">Education</p>

                          <p className="mt-1 font-semibold text-white">
                            ₦115,000
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-900 p-3">
                          <p className="text-xs text-slate-500">Health</p>

                          <p className="mt-1 font-semibold text-white">
                            ₦80,000
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-600 px-4 py-3 text-sm leading-6 text-white">
                      How can I save more for my laptop goal?
                    </div>

                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-4 text-sm leading-6 text-slate-200">
                      You're making progress. Your goal is currently at ₦90,000
                      of ₦150,000. I can help you look at your spending and
                      identify areas where you may be able to save.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3">
                    <span className="flex-1 text-sm text-slate-600">
                      Ask MoneyFlow Coach...
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
                  Start without the risk
                </p>

                <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  Free to use. No real money required.
                </h2>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  MoneyFlow is built to help you understand and plan your
                  finances. You don't deposit money into MoneyFlow, transfer
                  money through the app, or put your savings at risk.
                </p>

                <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                  Start by tracking your numbers, building better habits, and
                  learning how your financial decisions affect your goals.
                </p>

                <div className="mt-8">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white! transition hover:bg-slate-800"
                  >
                    Create your free account
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
                    <p className="font-semibold text-slate-900">No deposits</p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Your real money stays with you.
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
                      Free to start
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Create an account and get started.
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
                      Track, don't transfer
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      MoneyFlow helps you plan your money.
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
                  Inside MoneyFlow
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                  One place for the full picture.
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-600">
                  Move between your dashboard, transactions, budgets, and goals
                  without losing sight of the bigger picture.
                </p>

                <div className="mt-8 flex flex-wrap gap-2">
                  {(Object.keys(previewData) as PreviewTab[]).map((tab) => (
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
                      {previewData[tab].label}
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
                        <p className="text-xs text-slate-400">Total balance</p>

                        <p className="mt-2 text-3xl font-bold">₦845,000</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <p className="text-xs text-slate-500">Income</p>

                          <p className="mt-1 font-bold">₦420,000</p>
                        </div>

                        <div className="rounded-2xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">Expenses</p>

                          <p className="mt-1 font-bold">₦185,000</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "transactions" && (
                    <div className="space-y-3 p-5">
                      {[
                        ["Groceries", "₦18,500"],
                        ["Transport", "₦7,000"],
                        ["Freelance income", "+₦85,000"],
                        ["Internet", "₦12,000"],
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
                        ["Food", "₦60,000", "75%"],
                        ["Transport", "₦35,000", "55%"],
                        ["Entertainment", "₦18,000", "36%"],
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
                              Financial goal
                            </p>

                            <h4 className="mt-1 text-lg font-bold">
                              New Laptop
                            </h4>
                          </div>

                          <Target size={21} className="text-emerald-600" />
                        </div>

                        <div className="mt-6">
                          <div className="flex justify-between text-sm">
                            <span>₦90,000 saved</span>
                            <span>₦150,000</span>
                          </div>

                          <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full w-[60%] rounded-full bg-emerald-500" />
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            60% of your goal
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
                How it works
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Start simple. Build better habits.
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-400">
                MoneyFlow is built around a simple cycle: track your money,
                understand it, take control, and plan what comes next.
              </p>
            </div>
          </FadeLeft>

          <Stagger className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                number: "01",
                title: "Track your money",
                text: "Record the income and expenses that make up your everyday financial life.",
              },
              {
                number: "02",
                title: "Understand your spending",
                text: "See your spending patterns and discover where your money is really going.",
              },
              {
                number: "03",
                title: "Take control",
                text: "Set budgets, watch your limits, and make more intentional spending decisions.",
              },
              {
                number: "04",
                title: "Plan what comes next",
                text: "Set goals and turn the money you save today into progress toward tomorrow.",
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
              Stop wondering where your money went.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Whether you're managing a monthly income, saving for something
              important, or simply trying to spend more intentionally, MoneyFlow
              gives you the clarity to make your next decision with confidence.
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
                  Help us make MoneyFlow better.
                </h2>

                <p className="mt-3 text-lg leading-8 text-slate-600">
                  MoneyFlow is being built with real people in mind. Tell us
                  what you like, what we can improve, and what features you'd
                  love to see next.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Give feedback
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
                Questions
              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                The answers you need.
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
              Start understanding your money today.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-emerald-50">
              Take the first step toward clearer spending, better control, and
              financial goals you can actually see yourself reaching.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-emerald-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
              >
                Get started
                <ArrowRight size={17} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center rounded-xl border border-emerald-400 bg-emerald-700/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Sign in
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
              Understand your money. Control your future.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>

            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>

            <a href="#questions" className="transition hover:text-white">
              Questions
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
                  Help us improve MoneyFlow
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your feedback can shape what we build next.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFeedback}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close feedback form"
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
                  Thank you for your feedback.
                </h3>

                <p className="mx-auto mt-3 max-w-sm leading-7 text-slate-600">
                  Your thoughts will help us improve MoneyFlow and decide what
                  we should build next.
                </p>

                <button
                  type="button"
                  onClick={closeFeedback}
                  className="mt-7 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Done
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
                    What would you like to tell us?
                  </label>

                  <select
                    id="feedbackType"
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option>General feedback</option>

                    <option>Something I like</option>

                    <option>Something to improve</option>

                    <option>Feature request</option>

                    <option>Bug or problem</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="feedback"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Your feedback
                  </label>

                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    required
                    rows={5}
                    placeholder="What should we improve? What feature would you like to see?"
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedbackEmail"
                    className="mb-2 block text-sm font-semibold text-slate-800"
                  >
                    Email
                    <span className="ml-1 font-normal text-slate-400">
                      optional
                    </span>
                  </label>

                  <input
                    id="feedbackEmail"
                    type="email"
                    value={feedbackEmail}
                    onChange={(event) => setFeedbackEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Leave your email if you'd like us to follow up with you.
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

                  {feedbackSubmitting ? "Sending feedback..." : "Send feedback"}
                </button>

                <p className="text-center text-xs leading-5 text-slate-400">
                  We use feedback to improve MoneyFlow and decide which features
                  to build next.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
