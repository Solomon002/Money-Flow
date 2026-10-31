import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "../i18n/index.js";

type LanguageSwitcherProps = {
  className?: string;
};

export default function LanguageSwitcher({
  className = "",
}: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();

  return (
    <label
      className={`inline-flex items-center gap-2 text-sm text-slate-600 ${className}`}
    >
      <Globe size={16} aria-hidden="true" />

      <span className="sr-only">{t("common.language")}</span>

      <select
        value={i18n.resolvedLanguage ?? "en"}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-slate-900"
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
