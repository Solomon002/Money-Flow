import { pool } from "../db.js";

export async function getReportSummary(
  userId: string,
  startDate: string,
  endDate: string,
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
        AND transaction_date >= $2
        AND transaction_date <= $3
    `,
    [userId, startDate, endDate],
  );

  const row = result.rows[0];

  const totalIncomeMinor = Number(
    row.total_income_minor,
  );

  const totalExpenseMinor = Number(
    row.total_expense_minor,
  );

  return {
    totalIncomeMinor,
    totalExpenseMinor,
    totalBalanceMinor:
      totalIncomeMinor - totalExpenseMinor,
  };
}

export async function getSpendingByCategory(
  userId: string,
  startDate: string,
  endDate: string,
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
        AND t.transaction_date >= $2
        AND t.transaction_date <= $3
      GROUP BY
        c.id,
        c.name
      ORDER BY
        total_minor DESC,
        c.name ASC
    `,
    [userId, startDate, endDate],
  );

  return result.rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalMinor: Number(row.total_minor),
  }));
}