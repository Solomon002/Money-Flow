import { pool } from "../db.js";

export type NotificationType =
  | "budget_warning"
  | "goal_reminder"
  | "goal_completed"
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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

export async function getNotifications(userId: string) {
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
      LIMIT 50
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
      SELECT COUNT(*)::int AS count
      FROM public.notifications
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId],
  );

  return result.rows[0].count;
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
) {
  const result = await pool.query(
    `
      UPDATE public.notifications
      SET read_at = COALESCE(read_at, NOW())
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
    [notificationId, userId],
  );

  return result.rows[0] || null;
}

export async function markAllNotificationsAsRead(
  userId: string,
) {
  await pool.query(
    `
      UPDATE public.notifications
      SET read_at = NOW()
      WHERE user_id = $1
        AND read_at IS NULL
    `,
    [userId],
  );
}

export async function deleteNotification(
  userId: string,
  notificationId: string,
) {
  const result = await pool.query(
    `
      DELETE FROM public.notifications
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [notificationId, userId],
  );

  return result.rows[0] || null;
}

export async function checkBudgetAlert(
  userId: string,
  budgetId: string,
) {
  const budgetResult = await pool.query(
    `
      SELECT
        b.id,
        b.category_id,
        b.amount_minor,
        b.year,
        b.month,
        c.name AS category_name
      FROM public.budgets b
      INNER JOIN public.categories c
        ON c.id = b.category_id
       AND c.user_id = b.user_id
      WHERE b.id = $1
        AND b.user_id = $2
    `,
    [budgetId, userId],
  );

  if (budgetResult.rows.length === 0) {
    return null;
  }

  const budget = budgetResult.rows[0];

  const preferencesResult = await pool.query(
    `
      SELECT
        budget_alerts_enabled,
        currency_code
      FROM public.financial_preferences
      WHERE user_id = $1
    `,
    [userId],
  );

  if (
    preferencesResult.rows.length > 0 &&
    preferencesResult.rows[0].budget_alerts_enabled === false
  ) {
    return null;
  }

  const currency =
    preferencesResult.rows[0]?.currency_code || "NGN";

  const spendingResult = await pool.query(
    `
      SELECT
        COALESCE(SUM(t.amount_minor), 0)::bigint AS spent
      FROM public.transactions t
      WHERE t.user_id = $1
        AND t.category_id = $2
        AND t.type = 'expense'
        AND EXTRACT(YEAR FROM t.transaction_date) = $3
        AND EXTRACT(MONTH FROM t.transaction_date) = $4
    `,
    [
      userId,
      budget.category_id,
      budget.year,
      budget.month,
    ],
  );

  const spentMinor = Number(
    spendingResult.rows[0]?.spent || 0,
  );

  const budgetMinor = Number(budget.amount_minor);

  if (budgetMinor <= 0) {
    return null;
  }

  const percentage =
    (spentMinor / budgetMinor) * 100;

  let threshold = 0;

  if (percentage >= 100) {
    threshold = 100;
  } else if (percentage >= 90) {
    threshold = 90;
  } else if (percentage >= 70) {
    threshold = 70;
  }

  if (threshold === 0) {
    return null;
  }

  const existingNotification = await pool.query(
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
      budgetId,
      threshold >= 100
        ? `${budget.category_name} budget exceeded`
        : `${budget.category_name} budget warning`,
    ],
  );

  if (existingNotification.rows.length > 0) {
    return null;
  }

  const spent = spentMinor / 100;
  const budgetAmount = budgetMinor / 100;

  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  const formattedSpent = formatter.format(spent);
  const formattedBudget = formatter.format(
    budgetAmount,
  );

  let title: string;
  let message: string;

  if (threshold >= 100) {
    title = `${budget.category_name} budget exceeded`;

    message =
      `You've spent ${formattedSpent} against your ` +
      `${formattedBudget} ${budget.category_name} budget.`;
  } else {
    title = `${budget.category_name} budget warning`;

    message =
      `You've used ${Math.round(percentage)}% of your ` +
      `${budget.category_name} budget (${formattedSpent} ` +
      `of ${formattedBudget}).`;
  }

  return createNotification({
    userId,
    type: "budget_warning",
    title,
    message,
    budgetId,
  });
}

export async function checkGoalReminders(
  userId: string,
) {
  const preferencesResult = await pool.query(
    `
      SELECT
        goal_reminders_enabled,
        currency_code
      FROM public.financial_preferences
      WHERE user_id = $1
    `,
    [userId],
  );

  if (
    preferencesResult.rows.length > 0 &&
    preferencesResult.rows[0].goal_reminders_enabled === false
  ) {
    return null;
  }

  const currency =
    preferencesResult.rows[0]?.currency_code || "NGN";

  const goalsResult = await pool.query(
    `
      SELECT
        id,
        name,
        target_amount_minor,
        current_amount_minor,
        target_date
      FROM public.goals
      WHERE user_id = $1
        AND status = 'active'
        AND target_date IS NOT NULL
        AND target_date <= CURRENT_DATE
    `,
    [userId],
  );

  if (goalsResult.rows.length === 0) {
    return null;
  }

  const formatter = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  let createdNotification = null;

  for (const goal of goalsResult.rows) {
    const existingNotification = await pool.query(
      `
        SELECT id
        FROM public.notifications
        WHERE user_id = $1
          AND goal_id = $2
          AND type = 'goal_reminder'
        LIMIT 1
      `,
      [userId, goal.id],
    );

    if (existingNotification.rows.length > 0) {
      continue;
    }

    const targetAmount = Number(
      goal.target_amount_minor,
    );

    const currentAmount = Number(
      goal.current_amount_minor,
    );

    const remainingAmount = Math.max(
      0,
      targetAmount - currentAmount,
    );

    const formattedRemaining = formatter.format(
      remainingAmount / 100,
    );

    createdNotification = await createNotification({
      userId,
      type: "goal_reminder",
      title: `${goal.name} goal reminder`,
      message:
        remainingAmount > 0
          ? `Your ${goal.name} goal is due today. You still need ${formattedRemaining} to reach your target.`
          : `Your ${goal.name} goal is due today. You've reached your target!`,
      goalId: goal.id,
    });
  }

  return createdNotification;
}