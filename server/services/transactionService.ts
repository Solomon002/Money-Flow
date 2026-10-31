import { pool } from "../db.js";
import {
  checkBudgetAlert,
} from "./notificationService.js";

export type TransactionType =
  | "income"
  | "expense";

type CreateTransactionInput = {
  userId: string;
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  description: string;
  transactionDate: string;
  notes: string | null;
};

export async function createTransaction({
  userId,
  categoryId,
  type,
  amountMinor,
  description,
  transactionDate,
  notes,
}: CreateTransactionInput) {
  const result = await pool.query(
    `
      INSERT INTO public.transactions (
        user_id,
        category_id,
        type,
        amount_minor,
        description,
        transaction_date,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        category_id,
        type,
        amount_minor,
        description,
        transaction_date,
        notes,
        created_at,
        updated_at
    `,
    [
      userId,
      categoryId,
      type,
      amountMinor,
      description,
      transactionDate,
      notes,
    ],
  );

  const transaction = result.rows[0];

  if (type === "expense") {
    try {
      const budgetResult = await pool.query(
        `
          SELECT
            b.id
          FROM public.budgets b
          INNER JOIN public.categories budget_category
            ON budget_category.id = b.category_id
           AND budget_category.user_id = b.user_id
          INNER JOIN public.categories transaction_category
            ON transaction_category.id = $2
           AND transaction_category.user_id = $1
          WHERE b.user_id = $1
            AND (
              budget_category.id = transaction_category.id
              OR budget_category.id = transaction_category.parent_id
            )
            AND b.year = EXTRACT(
              YEAR FROM $3::date
            )::int
            AND b.month = EXTRACT(
              MONTH FROM $3::date
            )::int
          LIMIT 1
        `,
        [
          userId,
          categoryId,
          transactionDate,
        ],
      );

      const budget = budgetResult.rows[0];

      if (budget) {
        await checkBudgetAlert(
          userId,
          budget.id,
        );
      }
    } catch (error) {
      console.error(
        "Creating budget notification failed:",
        error,
      );
    }
  }

  return transaction;
}

export async function getTransactions(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        t.id,
        t.user_id,
        t.category_id,
        c.name AS category_name,
        parent.id AS parent_category_id,
        parent.name AS parent_category_name,
        t.type,
        t.amount_minor,
        t.description,
        t.transaction_date,
        t.notes,
        t.created_at,
        t.updated_at
      FROM public.transactions t
      INNER JOIN public.categories c
        ON c.id = t.category_id
       AND c.user_id = t.user_id
      LEFT JOIN public.categories parent
        ON parent.id = c.parent_id
       AND parent.user_id = c.user_id
      WHERE t.user_id = $1
      ORDER BY
        t.transaction_date DESC,
        t.created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function getTransactionSummary(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN type = 'income'
              THEN amount_minor
              ELSE 0
            END
          ),
          0
        ) AS total_income_minor,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'expense'
              THEN amount_minor
              ELSE 0
            END
          ),
          0
        ) AS total_expense_minor

      FROM public.transactions
      WHERE user_id = $1
    `,
    [userId],
  );

  const summary = result.rows[0];

  const totalIncomeMinor = Number(
    summary.total_income_minor,
  );

  const totalExpenseMinor = Number(
    summary.total_expense_minor,
  );

  return {
    totalIncomeMinor,
    totalExpenseMinor,
    totalBalanceMinor:
      totalIncomeMinor -
      totalExpenseMinor,
  };
}
export type ImportTransactionRow = {
  categoryId: string;
  type: TransactionType;
  amountMinor: number;
  description: string;
  transactionDate: string;
  notes: string | null;
};

/*
 * Inserts many transactions in one database transaction: either every
 * row is saved or none are. With skipDuplicates, a row is skipped when the
 * user already has a transaction with the same date, type, amount and
 * description (so importing the same bank statement twice is harmless).
 */
export async function importTransactions({
  userId,
  rows,
  skipDuplicates,
}: {
  userId: string;
  rows: ImportTransactionRow[];
  skipDuplicates: boolean;
}) {
  const client = await pool.connect();

  let insertedCount = 0;

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
        WITH incoming AS (
          SELECT *
          FROM unnest(
            $2::uuid[],
            $3::text[],
            $4::bigint[],
            $5::text[],
            $6::date[],
            $7::text[]
          ) AS r(category_id, type, amount_minor, description, transaction_date, notes)
        )
        INSERT INTO public.transactions (
          user_id,
          category_id,
          type,
          amount_minor,
          description,
          transaction_date,
          notes
        )
        SELECT
          $1,
          incoming.category_id,
          incoming.type,
          incoming.amount_minor,
          incoming.description,
          incoming.transaction_date,
          incoming.notes
        FROM incoming
        WHERE NOT $8::boolean
          OR NOT EXISTS (
            SELECT 1
            FROM public.transactions existing
            WHERE existing.user_id = $1
              AND existing.transaction_date = incoming.transaction_date
              AND existing.type = incoming.type
              AND existing.amount_minor = incoming.amount_minor
              AND lower(existing.description) = lower(incoming.description)
          )
        RETURNING id
      `,
      [
        userId,
        rows.map((row) => row.categoryId),
        rows.map((row) => row.type),
        rows.map((row) => row.amountMinor),
        rows.map((row) => row.description),
        rows.map((row) => row.transactionDate),
        rows.map((row) => row.notes),
        skipDuplicates,
      ],
    );

    insertedCount = result.rowCount ?? 0;

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // One budget check per affected budget, not one per imported row.
  try {
    const budgets = await pool.query<{ id: string }>(
      `
        SELECT DISTINCT b.id
        FROM public.budgets b
        INNER JOIN public.categories c
          ON c.user_id = b.user_id
         AND (c.id = b.category_id OR c.parent_id = b.category_id)
        INNER JOIN unnest($2::uuid[], $3::date[]) AS r(category_id, transaction_date)
          ON r.category_id = c.id
         AND b.year = EXTRACT(YEAR FROM r.transaction_date)::int
         AND b.month = EXTRACT(MONTH FROM r.transaction_date)::int
        WHERE b.user_id = $1
      `,
      [
        userId,
        rows.filter((row) => row.type === "expense").map((row) => row.categoryId),
        rows.filter((row) => row.type === "expense").map((row) => row.transactionDate),
      ],
    );

    for (const budget of budgets.rows) {
      await checkBudgetAlert(userId, budget.id);
    }
  } catch (error) {
    console.error("Budget alerts after import failed:", error);
  }

  return {
    importedCount: insertedCount,
    skippedCount: rows.length - insertedCount,
  };
}
