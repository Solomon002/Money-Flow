import { pool } from "../db.js";

export async function getInsightData(userId: string) {
  const result = await pool.query(
    `
      WITH current_month AS (
        SELECT
          DATE_TRUNC('month', CURRENT_DATE)::date AS start_date,
          (
            DATE_TRUNC('month', CURRENT_DATE)
            + INTERVAL '1 month'
            - INTERVAL '1 day'
          )::date AS end_date
      ),

      previous_month AS (
        SELECT
          (
            DATE_TRUNC('month', CURRENT_DATE)
            - INTERVAL '1 month'
          )::date AS start_date,
          (
            DATE_TRUNC('month', CURRENT_DATE)
            - INTERVAL '1 day'
          )::date AS end_date
      ),

      current_totals AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'income'
                THEN t.amount_minor
                ELSE 0
              END
            ),
            0
          ) AS income_minor,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'expense'
                THEN t.amount_minor
                ELSE 0
              END
            ),
            0
          ) AS expense_minor

        FROM public.transactions t
        CROSS JOIN current_month cm
        WHERE t.user_id = $1
          AND t.transaction_date >= cm.start_date
          AND t.transaction_date <= cm.end_date
      ),

      previous_totals AS (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'income'
                THEN t.amount_minor
                ELSE 0
              END
            ),
            0
          ) AS income_minor,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'expense'
                THEN t.amount_minor
                ELSE 0
              END
            ),
            0
          ) AS expense_minor

        FROM public.transactions t
        CROSS JOIN previous_month pm
        WHERE t.user_id = $1
          AND t.transaction_date >= pm.start_date
          AND t.transaction_date <= pm.end_date
      )

      SELECT
        ct.income_minor AS current_income_minor,
        ct.expense_minor AS current_expense_minor,
        pt.income_minor AS previous_income_minor,
        pt.expense_minor AS previous_expense_minor
      FROM current_totals ct
      CROSS JOIN previous_totals pt
    `,
    [userId],
  );

  const row = result.rows[0];

  const currentIncomeMinor = Number(
    row.current_income_minor,
  );

  const currentExpenseMinor = Number(
    row.current_expense_minor,
  );

  const previousIncomeMinor = Number(
    row.previous_income_minor,
  );

  const previousExpenseMinor = Number(
    row.previous_expense_minor,
  );

  let spendingChangePercent = 0;

  if (previousExpenseMinor > 0) {
    spendingChangePercent =
      ((currentExpenseMinor - previousExpenseMinor) /
        previousExpenseMinor) *
      100;
  } else if (currentExpenseMinor > 0) {
    spendingChangePercent = 100;
  }

  return {
    currentIncomeMinor,
    currentExpenseMinor,
    previousIncomeMinor,
    previousExpenseMinor,
    spendingChangePercent: Number(
      spendingChangePercent.toFixed(2),
    ),
  };
}

export async function getTopSpendingCategories(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        COALESCE(SUM(t.amount_minor), 0) AS total_minor
      FROM public.transactions t
      INNER JOIN public.categories c
        ON c.id = t.category_id
       AND c.user_id = t.user_id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND t.transaction_date >= DATE_TRUNC(
          'month',
          CURRENT_DATE
        )::date
        AND t.transaction_date < (
          DATE_TRUNC(
            'month',
            CURRENT_DATE
          )
          + INTERVAL '1 month'
        )::date
      GROUP BY
        c.id,
        c.name
      ORDER BY
        total_minor DESC,
        c.name ASC
      LIMIT 5
    `,
    [userId],
  );

  return result.rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalMinor: Number(row.total_minor),
  }));
}

export async function getBudgetInsights(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        b.id,
        b.monthly_amount_minor,
        b.category_id,
        c.name AS category_name,

        COALESCE(
          (
            SELECT SUM(t.amount_minor)
            FROM public.transactions t
            WHERE t.user_id = b.user_id
              AND t.category_id = b.category_id
              AND t.type = 'expense'
              AND t.transaction_date >= DATE_TRUNC(
                'month',
                CURRENT_DATE
              )::date
              AND t.transaction_date < (
                DATE_TRUNC(
                  'month',
                  CURRENT_DATE
                )
                + INTERVAL '1 month'
              )::date
          ),
          0
        ) AS spent_minor

      FROM public.budgets b
      INNER JOIN public.categories c
        ON c.id = b.category_id
       AND c.user_id = b.user_id
      WHERE b.user_id = $1
        AND b.month = EXTRACT(
          MONTH FROM CURRENT_DATE
        )::integer
        AND b.year = EXTRACT(
          YEAR FROM CURRENT_DATE
        )::integer
      ORDER BY
        c.name ASC
    `,
    [userId],
  );

  return result.rows.map((row) => {
    const budgetMinor = Number(
      row.monthly_amount_minor,
    );

    const spentMinor = Number(
      row.spent_minor,
    );

    const percentageUsed =
      budgetMinor > 0
        ? Number(
            ((spentMinor / budgetMinor) * 100).toFixed(
              2,
            ),
          )
        : 0;

    return {
      budgetId: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      budgetMinor,
      spentMinor,
      remainingMinor: budgetMinor - spentMinor,
      percentageUsed,
    };
  });
}