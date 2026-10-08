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
        COALESCE(parent.id, c.id) AS category_id,
        COALESCE(parent.name, c.name) AS category_name,
        COALESCE(SUM(t.amount_minor), 0) AS total_minor
      FROM public.transactions t
      INNER JOIN public.categories c
        ON c.id = t.category_id
       AND c.user_id = t.user_id
      LEFT JOIN public.categories parent
        ON parent.id = c.parent_id
       AND parent.user_id = c.user_id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND t.transaction_date >= $2
        AND t.transaction_date <= $3
      GROUP BY
        COALESCE(parent.id, c.id),
        COALESCE(parent.name, c.name)
      ORDER BY
        total_minor DESC,
        category_name ASC
    `,
    [userId, startDate, endDate],
  );

  return result.rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalMinor: Number(row.total_minor),
  }));
}

export async function getSpendingBreakdown(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const result = await pool.query(
    `
      SELECT
        COALESCE(parent.id, c.id) AS parent_category_id,
        COALESCE(parent.name, c.name) AS parent_category_name,
        c.id AS category_id,
        c.name AS category_name,
        c.parent_id,
        COALESCE(SUM(t.amount_minor), 0) AS total_minor
      FROM public.transactions t
      INNER JOIN public.categories c
        ON c.id = t.category_id
       AND c.user_id = t.user_id
      LEFT JOIN public.categories parent
        ON parent.id = c.parent_id
       AND parent.user_id = c.user_id
      WHERE t.user_id = $1
        AND t.type = 'expense'
        AND t.transaction_date >= $2
        AND t.transaction_date <= $3
      GROUP BY
        COALESCE(parent.id, c.id),
        COALESCE(parent.name, c.name),
        c.id,
        c.name,
        c.parent_id
      ORDER BY
        parent_category_name ASC,
        total_minor DESC,
        category_name ASC
    `,
    [userId, startDate, endDate],
  );

  return result.rows.map((row) => ({
    parentCategoryId: row.parent_category_id,
    parentCategoryName: row.parent_category_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    parentId: row.parent_id,
    totalMinor: Number(row.total_minor),
  }));
}