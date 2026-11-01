import { pool } from "../db.js";
import { merchantKey } from "./categorizationService.js";

/*
 * MoneyFlow Pro insights: recurring payments found in the user's own
 * history, and a projection of where the current month will end.
 */

const DAY_MS = 86_400_000;

type Row = {
  description: string;
  type: "income" | "expense";
  amount_minor: string;
  transaction_date: string;
  category_name: string | null;
};

export type RecurringPayment = {
  name: string;
  type: "income" | "expense";
  categoryName: string | null;
  amountMinor: number;
  frequency: "weekly" | "monthly";
  lastDate: string;
  nextDate: string;
  occurrences: number;
};

function toDay(value: string | Date): number {
  const date = typeof value === "string" ? new Date(value) : value;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

/*
 * A merchant counts as recurring when it appears at least 3 times, the
 * gaps between payments are steadily weekly (6-8 days) or monthly (26-35
 * days), and the amount varies by no more than 25%.
 */
export function detectRecurring(rows: Row[]): RecurringPayment[] {
  const groups = new Map<string, Row[]>();

  for (const row of rows) {
    const key = merchantKey(row.description);

    if (!key) {
      continue;
    }

    const groupKey = `${row.type}|${key}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
  }

  const found: RecurringPayment[] = [];

  for (const group of groups.values()) {
    if (group.length < 3) {
      continue;
    }

    const sorted = [...group].sort(
      (a, b) => toDay(a.transaction_date) - toDay(b.transaction_date),
    );
    const days = sorted.map((row) => toDay(row.transaction_date));
    const gaps = days.slice(1).map((day, index) => (day - days[index]) / DAY_MS);

    // Several payments on the same day are not a schedule.
    if (gaps.some((gap) => gap === 0)) {
      continue;
    }

    const typicalGap = median(gaps);
    const frequency =
      typicalGap >= 6 && typicalGap <= 8
        ? "weekly"
        : typicalGap >= 26 && typicalGap <= 35
          ? "monthly"
          : null;

    if (!frequency) {
      continue;
    }

    const [low, high] = frequency === "weekly" ? [5, 9] : [24, 38];

    if (!gaps.every((gap) => gap >= low && gap <= high)) {
      continue;
    }

    const amounts = sorted.map((row) => Number(row.amount_minor));
    const typicalAmount = median(amounts);

    if (
      typicalAmount <= 0 ||
      (Math.max(...amounts) - Math.min(...amounts)) / typicalAmount > 0.25
    ) {
      continue;
    }

    const last = sorted[sorted.length - 1];
    const lastDay = days[days.length - 1];

    found.push({
      name: last.description,
      type: last.type,
      categoryName: last.category_name,
      amountMinor: Math.round(typicalAmount),
      frequency,
      lastDate: isoDay(lastDay),
      nextDate: isoDay(lastDay + Math.round(typicalGap) * DAY_MS),
      occurrences: sorted.length,
    });
  }

  return found.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
}

export async function getProInsights(userId: string, now = new Date()) {
  const today = toDay(now);
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const daysInMonth = (nextMonthStart - monthStart) / DAY_MS;
  const daysElapsed = Math.floor((today - monthStart) / DAY_MS) + 1;

  const [history, budgets] = await Promise.all([
    pool.query<Row>(
      `
        SELECT t.description, t.type, t.amount_minor,
               t.transaction_date::text AS transaction_date,
               c.name AS category_name
        FROM public.transactions t
        LEFT JOIN public.categories c
          ON c.id = t.category_id AND c.user_id = t.user_id
        WHERE t.user_id = $1
          AND t.transaction_date >= (CURRENT_DATE - INTERVAL '200 days')
          AND t.transaction_date <= CURRENT_DATE
      `,
      [userId],
    ),
    pool.query<{ total: string | null }>(
      `
        SELECT SUM(monthly_amount_minor) AS total
        FROM public.budgets
        WHERE user_id = $1
          AND year = $2
          AND month = $3
      `,
      [userId, now.getUTCFullYear(), now.getUTCMonth() + 1],
    ),
  ]);

  const recurring = detectRecurring(history.rows);

  const thisMonth = history.rows.filter(
    (row) => toDay(row.transaction_date) >= monthStart,
  );
  const sum = (rows: Row[]) =>
    rows.reduce((total, row) => total + Number(row.amount_minor), 0);

  const spentSoFar = sum(thisMonth.filter((row) => row.type === "expense"));
  const incomeSoFar = sum(thisMonth.filter((row) => row.type === "income"));

  // Recurring payments still expected before the month ends.
  const upcoming = recurring.filter((item) => {
    const next = toDay(item.nextDate);
    return next > today && next < nextMonthStart;
  });
  const upcomingExpenses = upcoming
    .filter((item) => item.type === "expense")
    .reduce((total, item) => total + item.amountMinor, 0);
  const upcomingIncome = upcoming
    .filter((item) => item.type === "income")
    .reduce((total, item) => total + item.amountMinor, 0);

  // Everyday (non-recurring) spending continues at this month's pace.
  const recurringKeys = new Set(
    recurring.map((item) => `${item.type}|${merchantKey(item.name)}`),
  );
  const variableSpent = sum(
    thisMonth.filter(
      (row) =>
        row.type === "expense" &&
        !recurringKeys.has(`expense|${merchantKey(row.description)}`),
    ),
  );
  const dailyPace = variableSpent / daysElapsed;
  const daysLeft = daysInMonth - daysElapsed;

  const projectedSpending = Math.round(
    spentSoFar + dailyPace * daysLeft + upcomingExpenses,
  );
  const projectedIncome = incomeSoFar + upcomingIncome;
  const budgetTotal = budgets.rows[0]?.total ? Number(budgets.rows[0].total) : null;

  return {
    recurring,
    forecast: {
      month: isoDay(monthStart).slice(0, 7),
      daysElapsed,
      daysInMonth,
      spentSoFar,
      incomeSoFar,
      upcomingExpenses,
      projectedSpending,
      projectedIncome,
      projectedNet: projectedIncome - projectedSpending,
      budgetTotal,
    },
  };
}
