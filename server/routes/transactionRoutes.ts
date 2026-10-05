import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
} from "../services/transactionService.js";

const router = Router();

const MAX_AMOUNT = 10_000_000_000;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_NOTES_LENGTH = 2_000;

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.toISOString().slice(0, 10) === value;
}

function convertToMinorUnits(amount: unknown): number | null {
  const amountNumber = Number(amount);

  if (
    !Number.isFinite(amountNumber) ||
    amountNumber <= 0 ||
    amountNumber > MAX_AMOUNT
  ) {
    return null;
  }

  const amountMinor = Math.round(amountNumber * 100);

  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return null;
  }

  return amountMinor;
}

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

      const transactions = await getTransactions(req.userId);

      return res.status(200).json({
        status: "success",
        transactions,
      });
    } catch (error) {
      console.error("Getting transactions failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to get transactions",
      });
    }
  },
);

router.get(
  "/summary",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const summary = await getTransactionSummary(req.userId);

      return res.status(200).json({
        status: "success",
        summary,
      });
    } catch (error) {
      console.error(
        "Getting transaction summary failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to get transaction summary",
      });
    }
  },
);

router.post(
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

      const {
        categoryId,
        type,
        amount,
        description,
        transactionDate,
        notes,
      } = req.body;

      if (!isValidUuid(categoryId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid category",
        });
      }

      if (type !== "income" && type !== "expense") {
        return res.status(400).json({
          status: "error",
          message:
            "Transaction type must be income or expense",
        });
      }

      const amountMinor = convertToMinorUnits(amount);

      if (amountMinor === null) {
        return res.status(400).json({
          status: "error",
          message:
            "Amount must be greater than zero and no more than 10 billion.",
        });
      }

      if (
        typeof description !== "string" ||
        description.trim() === ""
      ) {
        return res.status(400).json({
          status: "error",
          message: "Description is required",
        });
      }

      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({
          status: "error",
          message:
            "Description must be 500 characters or less",
        });
      }

      if (!isValidDate(transactionDate)) {
        return res.status(400).json({
          status: "error",
          message:
            "Transaction date must be a valid date in YYYY-MM-DD format",
        });
      }

      if (
        notes !== undefined &&
        notes !== null &&
        typeof notes !== "string"
      ) {
        return res.status(400).json({
          status: "error",
          message: "Notes must be text",
        });
      }

      if (
        typeof notes === "string" &&
        notes.length > MAX_NOTES_LENGTH
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Notes must be 2,000 characters or less",
        });
      }

      const transaction = await createTransaction({
        userId: req.userId,
        categoryId,
        type,
        amountMinor,
        description: description.trim(),
        transactionDate,
        notes:
          typeof notes === "string" &&
          notes.trim() !== ""
            ? notes.trim()
            : null,
      });

      return res.status(201).json({
        status: "success",
        message: "Transaction created successfully",
        transaction,
      });
    } catch (error) {
      console.error(
        "Creating transaction failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to create transaction",
      });
    }
  },
);

export default router;