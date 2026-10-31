import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import LanguageSwitcher from "../components/LanguageSwitcher.js";
import {
  LAST_UPDATED,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  type LegalSection,
} from "../legal/content.js";

type LegalPageProps = {
  document: "terms" | "privacy";
};

const DOCUMENTS: Record<LegalPageProps["document"], LegalSection[]> = {
  terms: TERMS_OF_SERVICE,
  privacy: PRIVACY_POLICY,
};

export default function LegalPage({ document }: LegalPageProps) {
  const { t, i18n } = useTranslation();
  const sections = DOCUMENTS[document];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            ← {t("auth.backToMoneyFlow")}
          </Link>

          <LanguageSwitcher />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
          {t(`legal.${document}Title`)}
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {t("legal.lastUpdated", { date: LAST_UPDATED })}
        </p>

        {/* The legal text is only in English until it has been reviewed. */}
        {i18n.resolvedLanguage !== "en" && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t("legal.englishOnly")}
          </p>
        )}

        <div className="mt-8 space-y-8" lang="en">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-lg font-semibold text-slate-900">
                {section.heading}
              </h2>

              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 flex gap-4 border-t border-slate-100 pt-6 text-sm">
          <Link to="/terms" className="font-medium text-emerald-700 hover:underline">
            {t("legal.termsTitle")}
          </Link>

          <Link to="/privacy" className="font-medium text-emerald-700 hover:underline">
            {t("legal.privacyTitle")}
          </Link>
        </div>
      </article>
    </main>
  );
}
