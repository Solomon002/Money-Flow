import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "../db.js";
import { getProPriceMinor } from "../services/paystackService.js";
import { activateProFromPayment } from "../services/subscriptionService.js";

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
  const expectedSignature = Buffer.from(
    createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex"),
  );

  const receivedSignature = Buffer.from(signature);

  return (
    expectedSignature.length === receivedSignature.length &&
    timingSafeEqual(expectedSignature, receivedSignature)
  );
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

      if (!data.reference) {
        return res.status(200).json({
          status: "ignored",
          message: "Payment has no reference",
        });
      }

      // Paystack retries webhooks, and /verify may have already
      // recorded this reference, so only the first one grants Pro.
      const { alreadyProcessed } = await activateProFromPayment({
        userId,
        // Both were checked against the Pro price above.
        amountMinor: expectedAmountMinor,
        currency: "NGN",
        reference: data.reference,
        transactionId: data.id ?? null,
        channel: data.channel ?? null,
        paidAt: data.paid_at ?? data.created_at ?? null,
        customerCode: data.customer?.customer_code ?? null,
        subscriptionCode: data.subscription_code ?? null,
      });

      console.log(
        alreadyProcessed
          ? `Paystack payment ${data.reference} was already processed`
          : `MoneyFlow Pro activated through Paystack webhook for user ${userId}`,
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