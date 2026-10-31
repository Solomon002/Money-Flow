/*
 * Helpers for importing a bank statement CSV. Pure functions so they are
 * easy to reason about; the page handles the UI.
 */

export type DateFormat = "YMD" | "DMY" | "MDY";

export const DATE_FORMATS: DateFormat[] = ["YMD", "DMY", "MDY"];

// Header words banks commonly use, in the app's five languages.
const HEADER_HINTS = {
  date: ["date", "datum", "fecha", "data", "booking", "buchung", "value date", "valuta", "transaction date"],
  description: ["description", "details", "narration", "narrative", "remarks", "memo", "reference", "payee", "libellé", "libelle", "beschreibung", "verwendungszweck", "buchungstext", "concepto", "descripción", "descripcion", "descrição", "descricao", "histórico", "historico"],
  amount: ["amount", "montant", "betrag", "importe", "valor", "value", "sum"],
  debit: ["debit", "débit", "withdrawal", "money out", "paid out", "soll", "lastschrift", "cargo", "débito", "debito", "saída", "saida"],
  credit: ["credit", "crédit", "deposit", "money in", "paid in", "haben", "gutschrift", "abono", "ingreso", "crédito", "credito", "entrada"],
};

export type ColumnGuess = {
  date: string;
  description: string;
  amount: string;
  debit: string;
  credit: string;
};

export function guessColumns(headers: string[]): ColumnGuess {
  const find = (hints: string[], exclude: string[] = []) =>
    headers.find((header) => {
      const normalized = header.trim().toLowerCase();
      return (
        !exclude.includes(header) &&
        hints.some((hint) => normalized === hint || normalized.includes(hint))
      );
    }) ?? "";

  const debit = find(HEADER_HINTS.debit);
  const credit = find(HEADER_HINTS.credit, [debit]);
  const date = find(HEADER_HINTS.date);

  return {
    date,
    description: find(HEADER_HINTS.description, [date]),
    amount: find(HEADER_HINTS.amount, [debit, credit]),
    debit,
    credit,
  };
}

/*
 * Parses "1,234.56", "1.234,56", "₦ 1 234,56", "(50.00)", "-50", "50-",
 * "50 DR" and "50 CR". Returns a signed number, or null if unreadable.
 */
export function parseAmount(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw !== "string") {
    return null;
  }

  let text = raw.trim();

  if (!text) {
    return null;
  }

  let negative = false;

  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }

  if (/\b(dr|debit)\b\.?$/i.test(text)) {
    negative = true;
  }

  text = text.replace(/\b(dr|cr|debit|credit)\b\.?$/i, "");

  if (/-\s*$/.test(text) || /^\s*-/.test(text) || /^[^\d]*-/.test(text)) {
    negative = true;
  }

  // Keep only digits and separators.
  text = text.replace(/[^\d.,]/g, "");

  if (!/\d/.test(text)) {
    return null;
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Whichever comes last is the decimal separator.
    text =
      lastComma > lastDot
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastComma > -1) {
    // "12,50" is a decimal comma; "1,250" / "1,250,000" are thousands.
    const decimals = text.length - lastComma - 1;
    text =
      decimals === 2 && (text.match(/,/g) ?? []).length === 1
        ? text.replace(",", ".")
        : text.replace(/,/g, "");
  } else if (lastDot > -1 && (text.match(/\./g) ?? []).length > 1) {
    // "1.250.000" uses dots for thousands.
    text = text.replace(/\./g, "");
  }

  const value = Number(text);

  if (!Number.isFinite(value)) {
    return null;
  }

  return negative ? -value : value;
}

function isRealDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    year >= 1900 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// Returns "YYYY-MM-DD" or null.
export function parseDate(raw: unknown, format: DateFormat): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  // Drop any time part: "31/10/2026 14:05" -> "31/10/2026".
  const text = raw.trim().split(/[ T]/)[0];
  const parts = text.split(/[./-]/).map((part) => Number(part));

  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) {
    return null;
  }

  let [year, month, day] = [0, 0, 0];

  if (format === "YMD") {
    [year, month, day] = parts;
  } else if (format === "DMY") {
    [day, month, year] = parts;
  } else {
    [month, day, year] = parts;
  }

  if (year < 100) {
    year += 2000;
  }

  if (!isRealDate(year, month, day)) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Days between the earliest and latest date read with this format.
function spanInDays(values: string[], format: DateFormat): number {
  const times = values
    .map((value) => parseDate(value, format))
    .filter((date): date is string => date !== null)
    .map((date) => Date.parse(`${date}T00:00:00Z`));

  if (times.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (Math.max(...times) - Math.min(...times)) / 86_400_000;
}

/*
 * Picks the date format that reads every sample value.
 *
 * When both DMY and MDY fit (dates like 05/10/2026 only), the format that
 * keeps the dates closest together wins: a statement covers one short,
 * continuous period, so "5-7 Oct" beats "10 May - 10 Jul". Browser
 * language is a poor signal here (many phones outside the US report
 * en-US), so it only breaks an exact tie.
 */
export function detectDateFormat(
  values: string[],
  preferMonthFirst = false,
): DateFormat {
  const sample = values.filter((value) => value && value.trim()).slice(0, 200);
  // Allow a few junk rows ("Opening balance", footers) without failing.
  const fits = (format: DateFormat) =>
    sample.length > 0 &&
    sample.filter((value) => parseDate(value, format) !== null).length >=
      Math.ceil(sample.length * 0.9);

  if (fits("YMD")) {
    return "YMD";
  }

  const dmy = fits("DMY");
  const mdy = fits("MDY");

  if (dmy && mdy) {
    const dmySpan = spanInDays(sample, "DMY");
    const mdySpan = spanInDays(sample, "MDY");

    if (dmySpan !== mdySpan) {
      return dmySpan < mdySpan ? "DMY" : "MDY";
    }

    return preferMonthFirst ? "MDY" : "DMY";
  }

  if (mdy) {
    return "MDY";
  }

  return "DMY";
}
