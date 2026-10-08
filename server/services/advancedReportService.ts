import { pool } from "../db.js";

export async function getAdvancedReport(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const [
    summaryResult,
    categoryResult,
    transactionResult,
    budgetResult,
  ] = await Promise.all([
    pool.query(
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
    ),

    pool.query(
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
          total_minor DESC,
          parent_category_name ASC,
          category_name ASC
      `,
      [userId, startDate, endDate],
    ),

    pool.query(
      `
        SELECT
          t.id,
          t.category_id,
          c.name AS category_name,
          parent.name AS parent_category_name,
          t.type,
          t.amount_minor,
          t.description,
          t.transaction_date

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

        ORDER BY
          t.amount_minor DESC,
          t.transaction_date DESC

        LIMIT 10
      `,
      [userId, startDate, endDate],
    ),

    pool.query(
      `
        SELECT
          b.id,
          b.category_id,
          c.name AS category_name,
          b.monthly_amount_minor,
          b.month,
          b.year,

          COALESCE(
            SUM(
              CASE
                WHEN t.type = 'expense'
                THEN t.amount_minor
                ELSE 0
              END
            ),
            0
          ) AS spent_minor

        FROM public.budgets b

        INNER JOIN public.categories c
          ON c.id = b.category_id
         AND c.user_id = b.user_id

        LEFT JOIN public.transactions t
          ON t.user_id = b.user_id
         AND (
           t.category_id = b.category_id
           OR t.category_id IN (
             SELECT child.id
             FROM public.categories child
             WHERE child.parent_id = b.category_id
               AND child.user_id = b.user_id
           )
         )
         AND t.type = 'expense'
         AND EXTRACT(
           MONTH FROM t.transaction_date
         ) = b.month
         AND EXTRACT(
           YEAR FROM t.transaction_date
         ) = b.year

        WHERE b.user_id = $1
          AND (
            b.year > EXTRACT(
              YEAR FROM $2::date
            )::int

            OR (
              b.year = EXTRACT(
                YEAR FROM $2::date
              )::int

              AND b.month >= EXTRACT(
                MONTH FROM $2::date
              )::int
            )
          )
          AND (
            b.year < EXTRACT(
              YEAR FROM $3::date
            )::int

            OR (
              b.year = EXTRACT(
                YEAR FROM $3::date
              )::int

              AND b.month <= EXTRACT(
                MONTH FROM $3::date
              )::int
            )
          )

        GROUP BY
          b.id,
          b.category_id,
          c.name,
          b.monthly_amount_minor,
          b.month,
          b.year

        ORDER BY
          b.year DESC,
          b.month DESC,
          c.name ASC
      `,
      [userId, startDate, endDate],
    ),
  ]);

  const summary = summaryResult.rows[0];

  const totalIncomeMinor = Number(
    summary.total_income_minor,
  );

  const totalExpenseMinor = Number(
    summary.total_expense_minor,
  );

  const totalBalanceMinor =
    totalIncomeMinor - totalExpenseMinor;

  const spendingBreakdown =
    categoryResult.rows.map((row) => ({
      parentCategoryId:
        row.parent_category_id,
      parentCategoryName:
        row.parent_category_name,
      categoryId: row.category_id,
      categoryName: row.category_name,
      parentId: row.parent_id,
      totalMinor: Number(row.total_minor),
    }));

  const topSpendingTransactions =
    transactionResult.rows.map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      parentCategoryName:
        row.parent_category_name,
      type: row.type,
      amountMinor: Number(row.amount_minor),
      description: row.description,
      transactionDate: row.transaction_date,
    }));

  const budgetPerformance =
    budgetResult.rows.map((row) => {
      const budgetMinor = Number(
        row.monthly_amount_minor,
      );

      const spentMinor = Number(
        row.spent_minor,
      );

      const remainingMinor =
        budgetMinor - spentMinor;

      const percentageUsed =
        budgetMinor > 0
          ? (spentMinor / budgetMinor) * 100
          : 0;

      return {
        id: row.id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        budgetMinor,
        spentMinor,
        remainingMinor,
        percentageUsed,
        month: Number(row.month),
        year: Number(row.year),
      };
    });

  return {
    startDate,
    endDate,
    summary: {
      totalIncomeMinor,
      totalExpenseMinor,
      totalBalanceMinor,
    },
    spendingBreakdown,
    topSpendingTransactions,
    budgetPerformance,
  };
}

export type AdvancedAnalytics = {
  startDate: string;
  endDate: string;
  bucket: "day" | "week";
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    totalMinor: number;
    percentage: number;
  }>;
  topSubCategories: Array<{
    categoryId: string;
    categoryName: string;
    parentCategoryId: string;
    parentCategoryName: string;
    totalMinor: number;
    percentage: number;
  }>;
  categoryDonut: Array<{
    categoryId: string;
    categoryName: string;
    totalMinor: number;
    percentage: number;
  }>;
  incomeVsExpense: {
    totalIncomeMinor: number;
    totalExpenseMinor: number;
    totalBalanceMinor: number;
    incomePercentage: number;
    expensePercentage: number;
  };
  timeSeries: Array<{
    bucket: string;
    incomeMinor: number;
    expenseMinor: number;
  }>;
  topTransactions: Array<{
    id: string;
    description: string;
    categoryName: string;
    parentCategoryName: string | null;
    amountMinor: number;
    transactionDate: string;
  }>;
};

export async function getAdvancedAnalytics(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<AdvancedAnalytics> {
  const dayMs = 24 * 60 * 60 * 1000;

  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();

  const totalDays =
    Math.floor((end - start) / dayMs) + 1;

  const bucket: "day" | "week" =
    totalDays <= 30 ? "day" : "week";

  const [
    summaryResult,
    categoryResult,
    subCategoryResult,
    topTxResult,
    timeSeriesResult,
  ] = await Promise.all([
    pool.query(
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
    ),

    pool.query(
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

        ORDER BY total_minor DESC
        LIMIT 10
      `,
      [userId, startDate, endDate],
    ),

    pool.query(
      `
        SELECT
          c.id AS category_id,
          c.name AS category_name,
          parent.id AS parent_category_id,
          parent.name AS parent_category_name,
          COALESCE(SUM(t.amount_minor), 0) AS total_minor

        FROM public.transactions t

        INNER JOIN public.categories c
          ON c.id = t.category_id
         AND c.user_id = t.user_id

        INNER JOIN public.categories parent
          ON parent.id = c.parent_id
         AND parent.user_id = c.user_id

        WHERE t.user_id = $1
          AND t.type = 'expense'
          AND t.transaction_date >= $2
          AND t.transaction_date <= $3

        GROUP BY
          c.id,
          c.name,
          parent.id,
          parent.name

        ORDER BY total_minor DESC
        LIMIT 10
      `,
      [userId, startDate, endDate],
    ),

    pool.query(
      `
        SELECT
          t.id,
          t.description,
          c.name AS category_name,
          parent.name AS parent_category_name,
          t.amount_minor,
          t.transaction_date

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

        ORDER BY t.amount_minor DESC, t.transaction_date DESC
        LIMIT 20
      `,
      [userId, startDate, endDate],
    ),

    pool.query(
      `
        SELECT
          TO_CHAR(
            DATE_TRUNC($4, transaction_date),
            'YYYY-MM-DD'
          ) AS bucket,
          COALESCE(
            SUM(
              CASE
                WHEN type = 'income'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS income_minor,
          COALESCE(
            SUM(
              CASE
                WHEN type = 'expense'
                THEN amount_minor
                ELSE 0
              END
            ),
            0
          ) AS expense_minor

        FROM public.transactions
        WHERE user_id = $1
          AND transaction_date >= $2
          AND transaction_date <= $3

        GROUP BY bucket
        ORDER BY bucket ASC
      `,
      [userId, startDate, endDate, bucket],
    ),
  ]);

  const summary = summaryResult.rows[0];

  const totalIncomeMinor = Number(
    summary.total_income_minor,
  );

  const totalExpenseMinor = Number(
    summary.total_expense_minor,
  );

  const totalBalanceMinor =
    totalIncomeMinor - totalExpenseMinor;

  const incomePlusExpense =
    totalIncomeMinor + totalExpenseMinor;

  const incomePercentage =
    incomePlusExpense > 0
      ? (totalIncomeMinor / incomePlusExpense) * 100
      : 0;

  const expensePercentage =
    incomePlusExpense > 0
      ? (totalExpenseMinor / incomePlusExpense) * 100
      : 0;

  const categoryRows = categoryResult.rows.map((row) => {
    const totalMinor = Number(row.total_minor);

    return {
      categoryId: row.category_id as string,
      categoryName: row.category_name as string,
      totalMinor,
      percentage:
        totalExpenseMinor > 0
          ? (totalMinor / totalExpenseMinor) * 100
          : 0,
    };
  });

  const topCategories = categoryRows;

  const subCategoryRows = subCategoryResult.rows.map((row) => {
    const totalMinor = Number(row.total_minor);

    return {
      categoryId: row.category_id as string,
      categoryName: row.category_name as string,
      parentCategoryId: row.parent_category_id as string,
      parentCategoryName: row.parent_category_name as string,
      totalMinor,
      percentage:
        totalExpenseMinor > 0
          ? (totalMinor / totalExpenseMinor) * 100
          : 0,
    };
  });

  const topSubCategories = subCategoryRows;

  const topTransactions = topTxResult.rows.map((row) => ({
    id: row.id as string,
    description: row.description as string,
    categoryName: row.category_name as string,
    parentCategoryName: (row.parent_category_name as string) ?? null,
    amountMinor: Number(row.amount_minor),
    transactionDate: row.transaction_date as string,
  }));

  const timeSeries = timeSeriesResult.rows.map((row) => ({
    bucket: row.bucket as string,
    incomeMinor: Number(row.income_minor),
    expenseMinor: Number(row.expense_minor),
  }));

  return {
    startDate,
    endDate,
    bucket,
    topCategories,
    topSubCategories,
    categoryDonut: categoryRows,
    incomeVsExpense: {
      totalIncomeMinor,
      totalExpenseMinor,
      totalBalanceMinor,
      incomePercentage,
      expensePercentage,
    },
    timeSeries,
    topTransactions,
  };
}