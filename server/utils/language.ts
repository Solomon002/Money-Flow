// Languages the app is translated into. Request headers are only ever
// mapped onto this list, never passed through, because the value ends up
// in AI prompts and emails.
export const SUPPORTED_LANGUAGES = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  pt: "Portuguese",
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export function resolveLanguage(header: unknown): LanguageCode {
  if (typeof header !== "string") {
    return "en";
  }

  // "fr-FR,fr;q=0.9,en;q=0.8" -> first supported primary tag.
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();

    if (code in SUPPORTED_LANGUAGES) {
      return code as LanguageCode;
    }
  }

  return "en";
}
