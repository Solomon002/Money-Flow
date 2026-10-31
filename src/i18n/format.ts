import i18n from "./index.js";

/*
 * Locale-aware formatting. Amounts are stored in minor units (kobo,
 * cents); the active language decides separators and symbol placement,
 * e.g. "₦1,234.50" in English and "1 234,50 €" in French.
 */

function locale(): string {
  return i18n.resolvedLanguage ?? "en";
}

export function formatMoney(
  amountMinor: number | string,
  currencyCode: string = "NGN",
  { maximumFractionDigits = 2 }: { maximumFractionDigits?: number } = {},
): string {
  const amount = Number(amountMinor) / 100;

  try {
    return new Intl.NumberFormat(locale(), {
      style: "currency",
      currency: currencyCode,
      // "₦425,000" rather than "NGN 425,000".
      currencyDisplay: "narrowSymbol",
      // Whole amounts without decimals; "₦3,200.50", never "₦3,200.5".
      minimumFractionDigits:
        Number.isInteger(amount) ? 0 : Math.min(2, maximumFractionDigits),
      maximumFractionDigits,
    }).format(amount);
  } catch {
    // Unknown currency code: plain number.
    return amount.toLocaleString(locale());
  }
}

export function currencySymbol(currencyCode: string = "NGN"): string {
  try {
    return (
      new Intl.NumberFormat(locale(), {
        style: "currency",
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
      })
        .formatToParts(0)
        .find((part) => part.type === "currency")?.value ?? currencyCode
    );
  } catch {
    return currencyCode;
  }
}

export function formatNumber(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale(), options).format(value);
}

// Accepts "YYYY-MM-DD" (treated as a calendar day) or a full timestamp.
export function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
): string {
  const date = typeof value === "string" ? parseDate(value) : value;

  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(locale(), options).format(date);
}

// month is 1-12. "January" / "janvier" / "Januar" ...
export function monthName(
  month: number,
  style: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(locale(), { month: style }).format(
    new Date(2000, month - 1, 1),
  );
}

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === "string" ? parseDate(value) : value;

  if (!date) {
    return "";
  }

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale(), {
    numeric: "auto",
  });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(seconds) >= unitSeconds) {
      return formatter.format(Math.round(seconds / unitSeconds), unit);
    }
  }

  return formatter.format(0, "minute");
}
