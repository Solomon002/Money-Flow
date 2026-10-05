import { pool } from "../db.js";
import { checkBudgetAlert } from "./notificationService.js";

type CreateBudgetInput = {
  userId: string;
  categoryId: string;
  monthlyAmountMinor: number;
  month: number;
  year: number;
};

type UpdateBudgetInput = {
  userId: string;
  budgetId: string;
  categoryId: string;
  monthlyAmountMinor: number;
  month: number;
  year: number;
};

function getBudgetDate(
  year: number,
  month: number,
) {
  return `${year}-${String(month).padStart(
    2,
    "0",
  )}-01`;
}

export async function createBudget({
  userId,
  categoryId,
  monthlyAmountMinor,
  month,
  year,
}: CreateBudgetInput) {
  const result = await pool.query(
    `
      INSERT INTO public.budgets (
        user_id,
        category_id,
        monthly_amount_minor,
        month,
        year
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id,
        category_id,
        monthly_amount_minor,
        month,
        year,
        created_at,
        updated_at
    `,
    [
      userId,
      categoryId,
      monthlyAmountMinor,
      month,
      year,
    ],
  );

  const budget = result.rows[0];

  try {
    await checkBudgetAlert({
      userId,
      categoryId,
      transactionDate: getBudgetDate(
        year,
        month,
      ),
    });
  } catch (error) {
    console.error(
      "Checking budget alert after creation failed:",
      error,
    );
  }

  return budget;
}

export async function getBudgets(userId: string) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.user_id,
        b.category_id,
        c.name AS category_name,
        b.monthly_amount_minor,
        b.month,
        b.year,
        b.created_at,
        b.updated_at
      FROM public.budgets b
      INNER JOIN public.categories c
        ON c.id = b.category_id
       AND c.user_id = b.user_id
      WHERE b.user_id = $1
      ORDER BY
        b.year DESC,
        b.month DESC,
        c.name ASC
    `,
    [userId],
  );

  return result.rows;
}

export async function updateBudget({
  userId,
  budgetId,
  categoryId,
  monthlyAmountMinor,
  month,
  year,
}: UpdateBudgetInput) {
  const result = await pool.query(
    `
      UPDATE public.budgets
      SET
        category_id = $1,
        monthly_amount_minor = $2,
        month = $3,
        year = $4,
        updated_at = NOW()
      WHERE id = $5
        AND user_id = $6
      RETURNING
        id,
        user_id,
        category_id,
        monthly_amount_minor,
        month,
        year,
        created_at,
        updated_at
    `,
    [
      categoryId,
      monthlyAmountMinor,
      month,
      year,
      budgetId,
      userId,
    ],
  );

  const budget = result.rows[0] || null;

  if (!budget) {
    return null;
  }

  try {
    await checkBudgetAlert({
      userId,
      categoryId,
      transactionDate: getBudgetDate(
        year,
        month,
      ),
    });
  } catch (error) {
    console.error(
      "Checking budget alert after update failed:",
      error,
    );
  }

  return budget;
}

export async function deleteBudget(
  userId: string,
  budgetId: string,
) {
  const result = await pool.query(
    `
      DELETE FROM public.budgets
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [budgetId, userId],
  );

  return result.rows[0] || null;
}