// Shared input limits. Validating here keeps bad input a clean 400
// instead of a database error (500) further down.

// 10 billion in major units, same ceiling as transactions.
export const MAX_AMOUNT = 10_000_000_000;

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export const MAX_NAME_LENGTH = 120;
export const MAX_SHORT_TEXT_LENGTH = 120;
export const MAX_LONG_TEXT_LENGTH = 2_000;

// Must match CURRENCIES in src/i18n/currencies.ts. All use 2 decimal places.
export const ALLOWED_CURRENCIES = [
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
];

export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 320 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

/*
 * Converts a major-unit amount (e.g. 12.50) into minor units (1250).
 * Returns null when it is not a number, out of range, or (unless
 * allowZero) not positive.
 */
export function toMinorUnits(
  amount: unknown,
  { allowZero = false }: { allowZero?: boolean } = {},
): number | null {
  if (typeof amount !== "number" && typeof amount !== "string") {
    return null;
  }

  if (typeof amount === "string" && amount.trim() === "") {
    return null;
  }

  const amountNumber = Number(amount);

  if (
    !Number.isFinite(amountNumber) ||
    amountNumber < 0 ||
    (!allowZero && amountNumber === 0) ||
    amountNumber > MAX_AMOUNT
  ) {
    return null;
  }

  const amountMinor = Math.round(amountNumber * 100);

  if (!Number.isSafeInteger(amountMinor)) {
    return null;
  }

  if (!allowZero && amountMinor <= 0) {
    return null;
  }

  return amountMinor;
}

// Postgres error codes caused by bad client input rather than a server fault.
const CLIENT_INPUT_ERROR_CODES = new Set([
  "22P02", // invalid text representation (e.g. bad uuid)
  "22001", // string too long
  "22003", // numeric out of range
  "23503", // foreign key violation (e.g. category not owned by user)
  "23514", // check constraint violation
]);

export function isClientInputDbError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    CLIENT_INPUT_ERROR_CODES.has(String(error.code))
  );
}
