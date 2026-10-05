import { pool } from "../db.js";

export type NotificationType =
  | "budget_warning"
  | "goal_reminder"
  | "monthly_insight"
  | "recurring_payment";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  budgetId?: string | null;
  goalId?: string | null;
  recurringTransactionId?: string | null;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  budgetId = null,
  goalId = null,
  recurringTransactionId = null,
}: CreateNotificationInput) {
  const result = await pool.query(
    `
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        budget_id,
        goal_id,
        recurring_transaction_id
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        budget_id,
        goal_id,
        recurring_transaction_id,
        created_at
    `,
    [
      userId,
      type,
      title,
      message,
      budgetId,
      goalId,
      recurringTransactionId,
    ],
  );

  return result.rows[0];
}

export async function getNotifications(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        budget_id,
        goal_id,
        recurring_transaction_id,
        created_at
      FROM public.notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function getUnreadNotificationCount(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT COUNT(*)::INTEGER AS count
      FROM public.notifications
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId],
  );

  return result.rows[0].count;
}

export async function markNotificationAsRead({
  userId,
  notificationId,
}: {
  userId: string;
  notificationId: string;
}) {
  const result = await pool.query(
    `
      UPDATE public.notifications
      SET read_at = COALESCE(
        read_at,
        NOW()
      )
      WHERE id = $1
        AND user_id = $2
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        budget_id,
        goal_id,
        recurring_transaction_id,
        created_at
    `,
    [
      notificationId,
      userId,
    ],
  );

  return result.rows[0] || null;
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  const result = await pool.query(
    `
      UPDATE public.notifications
      SET read_at = NOW()
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId],
  );

  return result.rowCount ?? 0;
}

export async function deleteNotification({
  userId,
  notificationId,
}: {
  userId: string;
  notificationId: string;
}) {
  const result = await pool.query(
    `
      DELETE FROM public.notifications
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [
      notificationId,
      userId,
    ],
  );

  return result.rows.length > 0;
}

function formatMoney(
  amountMinor: number,
  currencyCode: string,
) {
  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: currencyCode,
      },
    ).format(amountMinor / 100);
  } catch {
    return `${currencyCode} ${(
      amountMinor / 100
    ).toFixed(2)}`;
  }
}

export async function checkBudgetAlert({
  userId,
  categoryId,
  transactionDate,
}: {
  userId: string;
  categoryId: string;
  transactionDate: string;
}) {
  const budgetResult = await pool.query(
    `
      SELECT
        b.id,
        b.monthly_amount_minor,
        b.month,
        b.year,
        c.name AS category_name,
        COALESCE(
          fp.currency_code,
          'NGN'
        ) AS currency_code
      FROM public.budgets b
      INNER JOIN public.categories c
        ON c.id = b.category_id
       AND c.user_id = b.user_id
      LEFT JOIN public.financial_preferences fp
        ON fp.user_id = b.user_id
      WHERE b.user_id = $1
        AND b.category_id = $2
        AND b.month = EXTRACT(
          MONTH FROM $3::DATE
        )
        AND b.year = EXTRACT(
          YEAR FROM $3::DATE
        )
      LIMIT 1
    `,
    [
      userId,
      categoryId,
      transactionDate,
    ],
  );

  if (budgetResult.rows.length === 0) {
    return null;
  }

  const budget = budgetResult.rows[0];

  const preferenceResult =
    await pool.query(
      `
        SELECT budget_alerts_enabled
        FROM public.financial_preferences
        WHERE user_id = $1
      `,
      [userId],
    );

  if (
    preferenceResult.rows.length > 0 &&
    preferenceResult.rows[0]
      .budget_alerts_enabled === false
  ) {
    return null;
  }

  const spendingResult =
    await pool.query(
      `
        SELECT
          COALESCE(
            SUM(amount_minor),
            0
          ) AS spent_minor
        FROM public.transactions
        WHERE user_id = $1
          AND category_id = $2
          AND type = 'expense'
          AND EXTRACT(
            MONTH FROM transaction_date
          ) = $3
          AND EXTRACT(
            YEAR FROM transaction_date
          ) = $4
      `,
      [
        userId,
        categoryId,
        budget.month,
        budget.year,
      ],
    );

  const spentMinor = Number(
    spendingResult.rows[0]
      .spent_minor,
  );

  const budgetMinor = Number(
    budget.monthly_amount_minor,
  );

  if (budgetMinor <= 0) {
    return null;
  }

  const percentage =
    (spentMinor / budgetMinor) * 100;

  let threshold:
    | 70
    | 90
    | 100
    | null = null;

  if (percentage >= 100) {
    threshold = 100;
  } else if (percentage >= 90) {
    threshold = 90;
  } else if (percentage >= 70) {
    threshold = 70;
  }

  if (threshold === null) {
    return null;
  }

  const title =
    threshold === 100
      ? `${budget.category_name} budget exceeded`
      : `${budget.category_name} budget at ${threshold}%`;

  const existingNotification =
    await pool.query(
      `
        SELECT id
        FROM public.notifications
        WHERE user_id = $1
          AND budget_id = $2
          AND type = 'budget_warning'
          AND title = $3
        LIMIT 1
      `,
      [
        userId,
        budget.id,
        title,
      ],
    );

  if (
    existingNotification.rows.length > 0
  ) {
    return null;
  }

  const spentFormatted =
    formatMoney(
      spentMinor,
      budget.currency_code,
    );

  const budgetFormatted =
    formatMoney(
      budgetMinor,
      budget.currency_code,
    );

  let message: string;

  if (threshold === 100) {
    message =
      `You've spent ${spentFormatted} on ${budget.category_name} this month, exceeding your ${budgetFormatted} budget.`;
  } else {
    message =
      `You've used ${Math.round(
        percentage,
      )}% of your ${budget.category_name} budget, spending ${spentFormatted} of ${budgetFormatted}.`;
  }

  return createNotification({
    userId,
    type: "budget_warning",
    title,
    message,
    budgetId: budget.id,
  });
}

export async function checkGoalReminders(
  userId: string,
) {
  const preferenceResult =
    await pool.query(
      `
        SELECT goal_reminders_enabled
        FROM public.financial_preferences
        WHERE user_id = $1
      `,
      [userId],
    );

  if (
    preferenceResult.rows.length > 0 &&
    preferenceResult.rows[0]
      .goal_reminders_enabled === false
  ) {
    return [];
  }

  const goalsResult = await pool.query(
    `
      SELECT
        g.id,
        g.name,
        g.target_amount_minor,
        g.current_amount_minor,
        g.target_date,
        COALESCE(
          fp.currency_code,
          'NGN'
        ) AS currency_code,
        (
          g.target_date::DATE - CURRENT_DATE
        ) AS days_remaining
      FROM public.goals g
      LEFT JOIN public.financial_preferences fp
        ON fp.user_id = g.user_id
      WHERE g.user_id = $1
        AND g.status = 'active'
        AND g.target_date IS NOT NULL
        AND g.current_amount_minor < g.target_amount_minor
        AND g.target_date::DATE <= CURRENT_DATE + 7
    `,
    [userId],
  );

  const createdNotifications = [];

  for (const goal of goalsResult.rows) {
    const daysRemaining = Number(
      goal.days_remaining,
    );

    let title = "";
    let message = "";

    const currentAmount = Number(
      goal.current_amount_minor,
    );

    const targetAmount = Number(
      goal.target_amount_minor,
    );

    const remainingAmount =
      Math.max(
        0,
        targetAmount - currentAmount,
      );

    const remainingFormatted =
      formatMoney(
        remainingAmount,
        goal.currency_code,
      );

    if (daysRemaining < 0) {
      title = `${goal.name} goal is overdue`;

      message =
        `Your ${goal.name} goal is past its target date. You still need ${remainingFormatted} to reach your goal.`;
    } else if (daysRemaining === 0) {
      title = `${goal.name} goal is due today`;

      message =
        `Your ${goal.name} goal is due today. You still need ${remainingFormatted} to reach your target.`;
    } else if (daysRemaining <= 3) {
      title = `${goal.name} goal is due soon`;

      message =
        `Your ${goal.name} goal is due in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}. You still need ${remainingFormatted} to reach your target.`;
    } else {
      title = `${goal.name} goal reminder`;

      message =
        `Your ${goal.name} goal is due in ${daysRemaining} days. You still need ${remainingFormatted} to reach your target.`;
    }

    const existingNotification =
      await pool.query(
        `
          SELECT id
          FROM public.notifications
          WHERE user_id = $1
            AND goal_id = $2
            AND type = 'goal_reminder'
            AND title = $3
          LIMIT 1
        `,
        [
          userId,
          goal.id,
          title,
        ],
      );

    if (
      existingNotification.rows.length > 0
    ) {
      continue;
    }

    const notification =
      await createNotification({
        userId,
        type: "goal_reminder",
        title,
        message,
        goalId: goal.id,
      });

    createdNotifications.push(
      notification,
    );
  }

  return createdNotifications;
}