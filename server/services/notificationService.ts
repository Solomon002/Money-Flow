import { pool } from "../db.js";
import { sendEmail } from "./emailService.js";

export type NotificationType =
  | "budget_warning"
  | "goal_reminder"
  | "goal_completed"
  | "monthly_insight"
  | "recurring_payment"
  | "subscription_expiring";

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
        b.monthly_amount_minor,
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
      INNER JOIN public.categories transaction_category
        ON transaction_category.id = t.category_id
       AND transaction_category.user_id = t.user_id
      WHERE t.user_id = $1
        AND (
          transaction_category.id = $2
          OR transaction_category.parent_id = $2
        )
        AND t.type = 'expense'
        AND EXTRACT(
          YEAR FROM t.transaction_date
        ) = $3
        AND EXTRACT(
          MONTH FROM t.transaction_date
        ) = $4
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

  const budgetMinor = Number(
    budget.monthly_amount_minor,
  );

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

const SUBSCRIPTION_REMINDER_WINDOW_DAYS = 7;

export async function checkSubscriptionReminder(
  userId: string,
) {
  const subscriptionResult = await pool.query<{
    plan: string;
    status: string;
    current_period_end: string | null;
  }>(
    `
      SELECT
        plan,
        status,
        current_period_end
      FROM public.subscriptions
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (subscriptionResult.rows.length === 0) {
    return null;
  }

  const subscription = subscriptionResult.rows[0];

  const isPro =
    subscription.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing");

  if (!isPro || !subscription.current_period_end) {
    return null;
  }

  const expiry = new Date(
    subscription.current_period_end,
  ).getTime();

  const now = Date.now();
  const diffMs = expiry - now;

  const daysUntilExpiry = Math.ceil(
    diffMs / (1000 * 60 * 60 * 24),
  );

  if (
    daysUntilExpiry < 0 ||
    daysUntilExpiry > SUBSCRIPTION_REMINDER_WINDOW_DAYS
  ) {
    return null;
  }

  const formattedExpiry = new Date(
    subscription.current_period_end,
  ).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayWord =
    daysUntilExpiry === 0
      ? "today"
      : daysUntilExpiry === 1
        ? "tomorrow"
        : `in ${daysUntilExpiry} days`;

  const message =
    `Your MoneyFlow Pro subscription expires ${dayWord} ` +
    `(${formattedExpiry}). Renew now to keep your Pro features.`;

  const existingNotification = await pool.query(
    `
      SELECT id
      FROM public.notifications
      WHERE user_id = $1
        AND type = 'subscription_expiring'
        AND message = $2
      LIMIT 1
    `,
    [userId, message],
  );

  if (existingNotification.rows.length > 0) {
    return null;
  }

  const notification = await createNotification({
    userId,
    type: "subscription_expiring",
    title: "Your MoneyFlow Pro subscription is expiring soon",
    message,
  });

  try {
    const userResult = await pool.query<{
      email: string;
    }>(
      `
        SELECT email
        FROM public.users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    const userEmail = userResult.rows[0]?.email;

    if (userEmail) {
      await sendEmail({
        to: userEmail,
        subject: "Your MoneyFlow Pro subscription is expiring soon",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h1 style="font-size: 22px; color: #0f172a; margin: 0 0 16px;">
              Your MoneyFlow Pro subscription is expiring soon
            </h1>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px;">
              ${message}
            </p>

            <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 24px;">
              Renew now to keep access to advanced reports, deeper insights, and all MoneyFlow Pro features.
            </p>

            <a
              href="${process.env.FRONTEND_URL || "http://localhost:5173"}/app/pro"
              style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 15px;"
            >
              Renew MoneyFlow Pro
            </a>

            <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 32px 0 0;">
              You're receiving this email because you have an active MoneyFlow Pro subscription.
            </p>
          </div>
        `,
      });
    }
  } catch (error) {
    console.error(
      "Sending subscription reminder email failed:",
      error,
    );
  }

  return notification;
}