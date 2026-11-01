import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Download, Trash2 } from "lucide-react";

import { deleteAccount, exportAccountData } from "../api/settings.js";
import { clearAuthTokens } from "../api/authStorage.js";

type AccountDataSectionProps = {
  email: string;
  hasPassword: boolean;
};

/*
 * "Your data" in Settings: download a copy of everything stored, or
 * permanently delete the account (GDPR / NDPA rights, Play Store rule).
 */
export default function AccountDataSection({
  email,
  hasPassword,
}: AccountDataSectionProps) {
  const { t } = useTranslation();

  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setError("");
    setExporting(true);

    try {
      const response = await exportAccountData();
      const blob = new Blob([JSON.stringify(response.data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `moneyflow-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("account.exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    setError("");
    setDeleting(true);

    try {
      await deleteAccount(
        hasPassword ? { password: confirmation } : { confirmEmail: confirmation },
      );

      clearAuthTokens();
      window.location.replace("/?accountDeleted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("account.deleteFailed"));
      setDeleting(false);
    }
  }

  const canDelete = hasPassword
    ? confirmation.length > 0
    : confirmation.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {t("account.title")}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {t("account.body")}{" "}
        <Link to="/privacy" className="font-medium text-emerald-700 hover:underline">
          {t("legal.privacyTitle")}
        </Link>
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Download size={17} />
          {exporting ? t("account.exporting") : t("account.export")}
        </button>

        {!confirmingDelete && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={17} />
            {t("account.delete")}
          </button>
        )}
      </div>

      {confirmingDelete && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-900">{t("account.deleteTitle")}</p>

          <p className="mt-1 text-sm leading-6 text-red-800">
            {t("account.deleteWarning")}
          </p>

          <label className="mt-4 block text-sm font-medium text-red-900">
            {hasPassword
              ? t("account.confirmPassword")
              : t("account.confirmEmail", { email })}

            <input
              type={hasPassword ? "password" : "email"}
              autoComplete={hasPassword ? "current-password" : "off"}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none focus:border-red-500"
            />
          </label>

          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                setConfirmation("");
                setError("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!canDelete || deleting}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? t("common.deleting") : t("account.deleteForever")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
