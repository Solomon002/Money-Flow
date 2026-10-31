import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  getSubscription,
  hasProAccess,
  cancelSubscription,
  reactivateSubscription,
  activateProFromPayment,
} from "../services/subscriptionService.js";
import {
  getProPriceMinor,
  initializeProSubscription,
  verifyPaystackTransaction,
} from "../services/paystackService.js";
import { pool } from "../db.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const subscription = await getSubscription(req.userId);

      return res.status(200).json({
        status: "success",
        subscription,
      });
    } catch (error) {
      console.error("Failed to get subscription:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to get subscription",
      });
    }
  },
);

router.get(
  "/access",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const isPro = await hasProAccess(req.userId);

      return res.status(200).json({
        status: "success",
        plan: isPro ? "pro" : "free",
        isPro,
      });
    } catch (error) {
      console.error("Failed to check subscription access:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to check subscription access",
      });
    }
  },
);

router.get(
  "/payments",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const paymentsResult = await pool.query<{
        id: string;
        amount_minor: string;
        currency: string;
        status: string;
        provider: string;
        provider_reference: string;
        channel: string | null;
        paid_at: string;
      }>(
        `
          SELECT
            id,
            amount_minor,
            currency,
            status,
            provider,
            provider_reference,
            channel,
            paid_at
          FROM subscription_payments
          WHERE user_id = $1
          ORDER BY paid_at DESC
          LIMIT 50
        `,
        [req.userId],
      );

      return res.status(200).json({
        status: "success",
        payments: paymentsResult.rows,
      });
    } catch (error) {
      console.error("Failed to get payment history:", error);

      return res.status(500).json({
        status: "error",
        message: "Failed to get payment history",
      });
    }
  },
);

router.post(
  "/initialize",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const planCode = process.env.PAYSTACK_PRO_PLAN_CODE;

      if (!planCode) {
        return res.status(500).json({
          status: "error",
          message: "Paystack Pro plan is not configured",
        });
      }

      const userResult = await pool.query<{
        email: string;
      }>(
        `
          SELECT email
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [req.userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const frontendUrl =
        process.env.FRONTEND_URL || "http://localhost:5173";

      const checkout = await initializeProSubscription({
        email: userResult.rows[0].email,
        planCode,
        callbackUrl: `${frontendUrl}/app/pro`,
        userId: req.userId,
      });

      return res.status(200).json({
        status: "success",
        checkout,
      });
    } catch (error) {
      console.error(
        "Failed to initialize Paystack subscription:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Failed to initialize Paystack subscription",
      });
    }
  },
);

router.post(
  "/verify",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const reference = req.body?.reference;

      if (typeof reference !== "string" || !reference.trim()) {
        return res.status(400).json({
          status: "error",
          message: "Paystack transaction reference is required",
        });
      }

      const userResult = await pool.query<{
        email: string;
      }>(
        `
          SELECT email
          FROM users
          WHERE id = $1
          LIMIT 1
        `,
        [req.userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      const transaction = await verifyPaystackTransaction(
        reference.trim(),
      );

      if (transaction.status !== "success") {
        return res.status(400).json({
          status: "error",
          message: "Paystack transaction was not successful",
        });
      }

      const expectedAmountMinor = getProPriceMinor();

      if (transaction.amount !== expectedAmountMinor) {
        return res.status(400).json({
          status: "error",
          message: "Invalid MoneyFlow Pro payment amount",
        });
      }

      if (transaction.currency !== "NGN") {
        return res.status(400).json({
          status: "error",
          message: "Invalid payment currency",
        });
      }

      if (transaction.reference !== reference.trim()) {
        return res.status(400).json({
          status: "error",
          message: "Transaction reference mismatch",
        });
      }

      const transactionEmail =
        transaction.customer?.email?.trim().toLowerCase();

      const userEmail =
        userResult.rows[0].email.trim().toLowerCase();

      if (!transactionEmail || transactionEmail !== userEmail) {
        return res.status(403).json({
          status: "error",
          message:
            "This payment does not belong to the authenticated user",
        });
      }

      let metadataUserId: string | null = null;

      if (typeof transaction.metadata === "string") {
        try {
          const parsedMetadata = JSON.parse(transaction.metadata);

          if (
            parsedMetadata &&
            typeof parsedMetadata === "object" &&
            typeof parsedMetadata.userId === "string"
          ) {
            metadataUserId = parsedMetadata.userId;
          }
        } catch {
          metadataUserId = null;
        }
      } else if (
        transaction.metadata &&
        typeof transaction.metadata === "object"
      ) {
        const metadata = transaction.metadata as {
          userId?: unknown;
        };

        if (typeof metadata.userId === "string") {
          metadataUserId = metadata.userId;
        }
      }

      if (metadataUserId !== req.userId) {
        return res.status(403).json({
          status: "error",
          message:
            "This payment is not associated with the authenticated account",
        });
      }

      // A reference that was already recorded (by an earlier /verify
      // call or by the webhook) does not extend the subscription again.
      const { subscription } = await activateProFromPayment({
        userId: req.userId,
        amountMinor: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        transactionId: transaction.id ?? null,
        channel: transaction.authorization?.channel ?? null,
        paidAt: transaction.paid_at ?? transaction.created_at ?? null,
        customerCode: transaction.customer?.customer_code ?? null,
        subscriptionCode: null,
      });

      return res.status(200).json({
        status: "success",
        message: "MoneyFlow Pro activated successfully",
        subscription,
      });
    } catch (error) {
      console.error(
        "Failed to verify Paystack transaction:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Failed to verify Paystack transaction",
      });
    }
  },
);

router.post(
  "/cancel",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const subscription = await cancelSubscription(req.userId);

      if (!subscription) {
        return res.status(400).json({
          status: "error",
          message:
            "No active MoneyFlow Pro subscription to cancel",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "MoneyFlow Pro subscription cancelled",
        subscription,
      });
    } catch (error) {
      console.error(
        "Failed to cancel subscription:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Failed to cancel subscription",
      });
    }
  },
);

router.post(
  "/reactivate",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const subscription = await reactivateSubscription(
        req.userId,
      );

      if (!subscription) {
        return res.status(400).json({
          status: "error",
          message:
            "No cancelled MoneyFlow Pro subscription to reactivate",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "MoneyFlow Pro subscription reactivated",
        subscription,
      });
    } catch (error) {
      console.error(
        "Failed to reactivate subscription:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Failed to reactivate subscription",
      });
    }
  },
);

export default router;