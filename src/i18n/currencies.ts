import i18n from "./index.js";

/*
 * Currencies a user can pick. Must match ALLOWED_CURRENCIES in
 * server/utils/validation.ts. All use 2 decimal places, which the app
 * relies on when storing amounts in minor units.
 */
export const CURRENCIES = [
  "NGN",
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "BRL",
  "MXN",
  "ZAR",
  "KES",
  "GHS",
  "INR",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "AED",
] as const;

// e.g. "Nigerian Naira (₦)" in English, "naira nigérian (₦)" in French.
export function currencyLabel(code: string): string {
  const language = i18n.resolvedLanguage ?? "en";

  let name: string = code;
  let symbol: string = code;

  try {
    name =
      new Intl.DisplayNames(language, { type: "currency" }).of(code) ?? code;

    symbol =
      new Intl.NumberFormat(language, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? code;
  } catch {
    // Older browsers: fall back to the code.
  }

  return symbol === code ? name : `${name} (${symbol})`;
}
