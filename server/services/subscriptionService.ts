import { pool } from "../db.js";

export type SubscriptionPlan = "free" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "expired";

export type Subscription = {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

const GRACE_PERIOD_DAYS = 5;

export async function getOrCreateSubscription(
  userId: string,
): Promise<Subscription> {
  const existingResult = await pool.query<Subscription>(
    `
      SELECT
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
      FROM subscriptions
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId],
  );

  if (existingResult.rows.length > 0) {
    const subscription = existingResult.rows[0];

    let hasExpired = false;

    if (
      subscription.plan === "pro" &&
      subscription.current_period_end !== null
    ) {
      const expiresAt =
        new Date(subscription.current_period_end).getTime() +
        GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

      hasExpired = expiresAt < Date.now();
    }

    if (hasExpired) {
      const expiredResult = await pool.query<Subscription>(
        `
          UPDATE subscriptions
          SET
            plan = 'free',
            status = 'expired',
            updated_at = NOW()
          WHERE user_id = $1
          RETURNING
            id,
            user_id,
            plan,
            status,
            provider,
            provider_customer_id,
            provider_subscription_id,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
        `,
        [userId],
      );

      return expiredResult.rows[0];
    }

    return subscription;
  }

  const createdResult = await pool.query<Subscription>(
    `
      INSERT INTO subscriptions (
        user_id,
        plan,
        status
      )
      VALUES ($1, 'free', 'active')
      RETURNING
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    `,
    [userId],
  );

  return createdResult.rows[0];
}

export async function getSubscription(
  userId: string,
): Promise<Subscription> {
  return getOrCreateSubscription(userId);
}

export async function hasProAccess(
  userId: string,
): Promise<boolean> {
  const subscription = await getOrCreateSubscription(userId);

  return (
    subscription.plan === "pro" &&
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "cancelled")
  );
}

export async function updateSubscriptionPlan(
  userId: string,
  plan: SubscriptionPlan,
): Promise<Subscription> {
  const result = await pool.query<Subscription>(
    `
      UPDATE subscriptions
      SET
        plan = $2,
        status = 'active',
        updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    `,
    [userId, plan],
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const createdResult = await pool.query<Subscription>(
    `
      INSERT INTO subscriptions (
        user_id,
        plan,
        status
      )
      VALUES ($1, $2, 'active')
      RETURNING
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    `,
    [userId, plan],
  );

  return createdResult.rows[0];
}

export async function cancelSubscription(
  userId: string,
): Promise<Subscription | null> {
  const result = await pool.query<Subscription>(
    `
      UPDATE subscriptions
      SET
        status = 'cancelled',
        updated_at = NOW()
      WHERE user_id = $1
        AND plan = 'pro'
        AND status IN ('active', 'trialing')
      RETURNING
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    `,
    [userId],
  );

  return result.rows[0] || null;
}

export async function reactivateSubscription(
  userId: string,
): Promise<Subscription | null> {
  const result = await pool.query<Subscription>(
    `
      UPDATE subscriptions
      SET
        status = 'active',
        updated_at = NOW()
      WHERE user_id = $1
        AND plan = 'pro'
        AND status = 'cancelled'
      RETURNING
        id,
        user_id,
        plan,
        status,
        provider,
        provider_customer_id,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    `,
    [userId],
  );

  return result.rows[0] || null;
}