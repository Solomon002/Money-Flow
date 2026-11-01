import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

/*
 * Translations live in locales/<language>/<section>.json. Each section
 * becomes a top-level key, e.g. locales/fr/transactions.json is used as
 * t("transactions.title"). locales/<language>/server.json is the separate
 * "server" namespace for API error messages.
 */
const localeFiles = import.meta.glob<Record<string, unknown>>(
  "./locales/*/*.json",
  { eager: true, import: "default" },
);

type Resources = Record<
  string,
  { translation: Record<string, unknown>; server: Record<string, unknown> }
>;

const resources: Resources = {};

for (const [path, content] of Object.entries(localeFiles)) {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);

  if (!match) {
    continue;
  }

  const [, language, section] = match;

  resources[language] ??= { translation: {}, server: {} };

  if (section === "server") {
    resources[language].server = content;
  } else {
    resources[language].translation[section] = content;
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "moneyflow_language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ["translation", "server"],
    defaultNS: "translation",
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    // "fr-CA" -> "fr", "pt-BR" -> "pt"
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: {
      // React already escapes rendered values.
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

function syncDocumentLanguage(language: string) {
  document.documentElement.lang = language;
}

syncDocumentLanguage(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", syncDocumentLanguage);

/*
 * Server responses carry English messages. They are looked up in the
 * "server" namespace by their exact text; anything without a
 * translation is shown in English.
 */
export function translateServerMessage(message: string): string {
  return i18n.t(message, {
    ns: "server",
    defaultValue: message,
    keySeparator: false,
    nsSeparator: false,
  });
}

export function currentLanguage(): LanguageCode {
  const resolved = i18n.resolvedLanguage ?? "en";

  return (
    SUPPORTED_LANGUAGES.find((language) => language.code === resolved)
      ?.code ?? "en"
  );
}

export default i18n;
