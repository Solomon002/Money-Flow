import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getCategories, type Category } from "../api/categories.js";
import { apiRequest } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import { currencySymbol as getCurrencySymbol } from "../i18n/format.js";
import { categoryLabel } from "../i18n/categories.js";
import { todayLocalDate } from "../utils/dates.js";

export default function AddTransactionPage() {
  const navigate = useNavigate();
  const { onboardingPreferences } = useAuth();
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    todayLocalDate(),
  );
  const [notes, setNotes] = useState("");

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const currencySymbol = getCurrencySymbol(
    onboardingPreferences?.currency_code || "NGN",
  );

  useEffect(() => {
    async function loadCategories() {
      setIsLoadingCategories(true);
      setErrorMessage("");

      try {
        const result = await getCategories();

        if (!result.response.ok) {
          throw new Error(result.data.message || t("transactions.categoriesFailed"));
        }

        setCategories(result.data.categories);
      } catch (error) {
        console.error("Loading categories failed:", error);

        setErrorMessage(
          error instanceof Error ? error.message : t("transactions.categoriesFailed"),
        );
      } finally {
        setIsLoadingCategories(false);
      }
    }

    loadCategories();
  }, []);

  const availableCategories = categories.filter(
    (category) => category.kind === type && category.parent_id === null,
  );

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  const availableSubcategories = categories.filter(
    (category) => category.kind === type && category.parent_id === categoryId,
  );

  useEffect(() => {
    setCategoryId("");
    setSubcategoryId("");
  }, [type]);

  useEffect(() => {
    setSubcategoryId("");
  }, [categoryId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");

    if (!categoryId) {
      setErrorMessage(t("transactions.form.selectCategoryError"));
      return;
    }

    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setErrorMessage(t("transactions.form.amountError"));
      return;
    }

    if (!description.trim()) {
      setErrorMessage(t("transactions.form.descriptionError"));
      return;
    }

    setIsSaving(true);

    try {
      const result = await apiRequest("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          categoryId: subcategoryId || categoryId,
          type,
          amount: amountNumber,
          description: description.trim(),
          transactionDate,
          notes: notes.trim() || null,
        }),
      });

      if (!result.response.ok) {
        throw new Error(result.data.message || t("transactions.form.createFailed"));
      }

      navigate("/app/transactions");
    } catch (error) {
      console.error("Creating transaction failed:", error);

      setErrorMessage(
        error instanceof Error ? error.message : t("transactions.form.createFailed"),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/app/transactions")}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <p className="text-sm text-slate-500">{t("transactions.eyebrow")}</p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t("transactions.add")}
          </h1>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              {t("transactions.form.type")}
            </label>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  type === "expense"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("common.expense")}
              </button>

              <button
                type="button"
                onClick={() => setType("income")}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  type === "income"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {t("common.income")}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.category")}
            </label>

            <select
              id="category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isLoadingCategories}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 disabled:bg-slate-100"
            >
              <option value="">
                {isLoadingCategories
                  ? t("transactions.form.loadingCategories")
                  : t("transactions.form.selectCategory")}
              </option>

              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabel(category.name)}
                </option>
              ))}
            </select>
          </div>

          {selectedCategory && availableSubcategories.length > 0 && (
            <div>
              <label
                htmlFor="subcategory"
                className="block text-sm font-medium text-slate-700"
              >
                {t("transactions.form.subcategory")}
              </label>

              <select
                id="subcategory"
                value={subcategoryId}
                onChange={(event) => setSubcategoryId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              >
                <option value="">{t("transactions.form.noSubcategory")}</option>

                {availableSubcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {categoryLabel(subcategory.name)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.amount")}
            </label>

            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {currencySymbol}
              </span>

              <input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.description")}
            </label>

            <input
              id="description"
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("transactions.form.descriptionPlaceholder")}
              maxLength={160}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="transactionDate"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.date")}
            </label>

            <input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-slate-700"
            >
              {t("common.notes")}
            </label>

            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("transactions.form.notesPlaceholder")}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/app/transactions")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>

            <button
              type="submit"
              disabled={isSaving || isLoadingCategories}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t("common.saving") : t("transactions.form.submit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
