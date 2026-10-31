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

export type ProPayment = {
  userId: string;
  amountMinor: number;
  currency: string;
  reference: string;
  transactionId: number | null;
  channel: string | null;
  paidAt: string | null;
  customerCode: string | null;
  subscriptionCode: string | null;
};

/*
 * Records a verified Pro payment and grants 30 days of Pro for it.
 *
 * Each provider reference can only ever grant access once: the payment
 * row is inserted first and, if that reference was already recorded
 * (by /verify, the webhook, or a replayed request), the subscription is
 * left untouched. A renewal before the current period ends is added on
 * top of the remaining time instead of replacing it.
 */
export async function activateProFromPayment(
  payment: ProPayment,
): Promise<{
  subscription: Subscription;
  alreadyProcessed: boolean;
}> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `
        INSERT INTO subscription_payments (
          user_id,
          amount_minor,
          currency,
          status,
          provider,
          provider_reference,
          provider_transaction_id,
          channel,
          paid_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'success',
          'paystack',
          $4,
          $5,
          $6,
          COALESCE($7, NOW())
        )
        ON CONFLICT (provider, provider_reference)
        DO NOTHING
        RETURNING id
      `,
      [
        payment.userId,
        payment.amountMinor,
        payment.currency,
        payment.reference,
        payment.transactionId,
        payment.channel,
        payment.paidAt,
      ],
    );

    const alreadyProcessed = paymentResult.rows.length === 0;

    if (alreadyProcessed) {
      await client.query("COMMIT");

      return {
        subscription: await getOrCreateSubscription(payment.userId),
        alreadyProcessed: true,
      };
    }

    const subscriptionResult = await client.query<Subscription>(
      `
        INSERT INTO subscriptions (
          user_id,
          plan,
          status,
          provider,
          provider_customer_id,
          provider_subscription_id,
          current_period_start,
          current_period_end
        )
        VALUES (
          $1,
          'pro',
          'active',
          'paystack',
          $2,
          $3,
          COALESCE($4::timestamptz, NOW()),
          NOW() + INTERVAL '30 days'
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          plan = 'pro',
          status = 'active',
          provider = 'paystack',
          provider_customer_id = COALESCE(
            EXCLUDED.provider_customer_id,
            subscriptions.provider_customer_id
          ),
          provider_subscription_id = COALESCE(
            EXCLUDED.provider_subscription_id,
            subscriptions.provider_subscription_id
          ),
          current_period_start = EXCLUDED.current_period_start,
          current_period_end = CASE
            WHEN subscriptions.plan = 'pro'
              AND subscriptions.current_period_end > NOW()
            THEN subscriptions.current_period_end + INTERVAL '30 days'
            ELSE NOW() + INTERVAL '30 days'
          END,
          updated_at = NOW()
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
      [
        payment.userId,
        payment.customerCode,
        payment.subscriptionCode,
        payment.paidAt,
      ],
    );

    await client.query("COMMIT");

    return {
      subscription: subscriptionResult.rows[0],
      alreadyProcessed: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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