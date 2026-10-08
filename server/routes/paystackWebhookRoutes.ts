import { Router } from "express";
import { createHmac } from "node:crypto";
import { pool } from "../db.js";
import { getProPriceMinor } from "../services/paystackService.js";

const router = Router();

type PaystackWebhookEvent = {
  event?: string;
  data?: {
    id?: number;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string | null;
    created_at?: string;
    channel?: string;
    customer?: {
      id?: number;
      customer_code?: string;
      email?: string;
    };
    plan?: {
      id?: number;
      name?: string;
      plan_code?: string;
      amount?: number;
      interval?: string;
    } | null;
    metadata?: unknown;
    subscription_code?: string;
  };
};

type PaystackMetadata = {
  userId?: unknown;
  product?: unknown;
};

function getPaystackSecretKey(): string {
  const env = (
    globalThis as typeof globalThis & {
      process?: {
        env?: Record<string, string | undefined>;
      };
    }
  ).process?.env;

  const secretKey = env?.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  return secretKey;
}

function getMetadata(
  metadata: unknown,
): PaystackMetadata | null {
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);

      if (parsed && typeof parsed === "object") {
        return parsed as PaystackMetadata;
      }

      return null;
    } catch {
      return null;
    }
  }

  if (metadata && typeof metadata === "object") {
    return metadata as PaystackMetadata;
  }

  return null;
}

function getMetadataUserId(metadata: unknown): string | null {
  const parsed = getMetadata(metadata);

  if (
    parsed &&
    typeof parsed.userId === "string" &&
    parsed.userId.length > 0
  ) {
    return parsed.userId;
  }

  return null;
}

function isValidPaystackSignature(
  rawBody: Buffer,
  signature: string,
  secretKey: string,
): boolean {
  const expectedSignature = createHmac("sha512", secretKey)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}

router.post("/", async (req, res) => {
  try {
    const secretKey = getPaystackSecretKey();

    const signature = req.header("x-paystack-signature");

    if (!signature) {
      return res.status(401).json({
        status: "error",
        message: "Missing Paystack signature",
      });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid webhook body",
      });
    }

    const isValid = isValidPaystackSignature(
      req.body,
      signature,
      secretKey,
    );

    if (!isValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid Paystack signature",
      });
    }

    const event = JSON.parse(
      req.body.toString("utf8"),
    ) as PaystackWebhookEvent;

    console.log("Paystack webhook received:", event.event);

    if (event.event === "charge.success") {
      const data = event.data;

      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Missing Paystack event data",
        });
      }

      const expectedAmountMinor = getProPriceMinor();

      if (
        data.status !== "success" ||
        data.amount !== expectedAmountMinor ||
        data.currency !== "NGN"
      ) {
        return res.status(200).json({
          status: "ignored",
          message:
            "Payment does not match MoneyFlow Pro requirements",
        });
      }

      const metadata = getMetadata(data.metadata);
      const metadataUserId = getMetadataUserId(data.metadata);

      let userId = metadataUserId;

      if (!userId && data.customer?.customer_code) {
        const subscriptionResult = await pool.query<{
          user_id: string;
        }>(
          `
            SELECT user_id
            FROM subscriptions
            WHERE provider = 'paystack'
              AND provider_customer_id = $1
            LIMIT 1
          `,
          [data.customer.customer_code],
        );

        if (subscriptionResult.rows.length > 0) {
          userId = subscriptionResult.rows[0].user_id;
        }
      }

      if (!userId) {
        console.error(
          "Could not identify MoneyFlow user for Paystack webhook",
          {
            reference: data.reference,
            customerCode: data.customer?.customer_code,
          },
        );

        return res.status(200).json({
          status: "ignored",
          message: "MoneyFlow user could not be identified",
        });
      }

      const userResult = await pool.query<{
        id: string;
      }>(
        `
          SELECT id
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [userId],
      );

      if (userResult.rows.length === 0) {
        console.error(
          "Paystack webhook referenced a user that does not exist",
          {
            reference: data.reference,
            userId,
          },
        );

        return res.status(200).json({
          status: "ignored",
          message: "MoneyFlow user does not exist",
        });
      }

      await pool.query(
        `
          INSERT INTO subscriptions (
            user_id,
            plan,
            status,
            provider,
            provider_customer_id,
            provider_subscription_id,
            current_period_start,
            updated_at
          )
          VALUES (
            $1,
            'pro',
            'active',
            'paystack',
            $2,
            $3,
            $4,
            NOW()
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
            current_period_start = COALESCE(
              EXCLUDED.current_period_start,
              subscriptions.current_period_start
            ),
            updated_at = NOW()
        `,
        [
          userId,
          data.customer?.customer_code ?? null,
          data.subscription_code ?? null,
          data.paid_at ?? data.created_at ?? null,
        ],
      );

      await pool.query(
        `
          UPDATE subscriptions
          SET
            current_period_end = NOW() + INTERVAL '30 days',
            updated_at = NOW()
          WHERE user_id = $1
        `,
        [userId],
      );

      if (data.reference) {
        await pool.query(
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
          `,
          [
            userId,
            data.amount ?? expectedAmountMinor,
            data.currency ?? "NGN",
            data.reference,
            data.id ?? null,
            data.channel ?? null,
            data.paid_at ?? data.created_at ?? null,
          ],
        );
      }

      console.log(
        `MoneyFlow Pro activated through Paystack webhook for user ${userId}`,
      );

      console.log("Paystack payment metadata:", {
        userId,
        product: metadata?.product ?? null,
        channel: data.channel ?? null,
        reference: data.reference ?? null,
      });
    }

    /*
     * Future-proofing note (not currently handled):
     *
     * The following Paystack events only fire if the integration uses
     * Paystack-managed recurring subscriptions (i.e. a `plan` is attached
     * to `transaction/initialize`). MoneyFlow currently uses manual
     * renewals with no Paystack plan, so these events will not arrive.
     *
     * If the integration is ever switched to Paystack-managed recurring:
     *
     *   - event === "subscription.disable"
     *       → set subscriptions.status = 'cancelled' for the matching user.
     *
     *   - event === "charge.failed" / "invoice.payment_failed"
     *       → set subscriptions.status = 'past_due' for the matching user,
     *         and start a grace-period timer before downgrading to 'expired'.
     *
     * Both handlers would look up the user the same way `charge.success`
     * does (via metadata.userId, falling back to provider_customer_id).
     */

    return res.status(200).json({
      status: "success",
      message: "Webhook processed",
    });
  } catch (error) {
    console.error(
      "Failed to process Paystack webhook:",
      error,
    );

    return res.status(500).json({
      status: "error",
      message: "Failed to process Paystack webhook",
    });
  }
});

export default router;