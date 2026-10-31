import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  createTransaction,
  getTransactions,
  getTransactionSummary,
  importTransactions,
  type ImportTransactionRow,
} from "../services/transactionService.js";
import { importRateLimiter } from "../middleware/rateLimitMiddleware.js";
import { isClientInputDbError } from "../utils/validation.js";

const router = Router();

const MAX_AMOUNT = 10_000_000_000;
// Matches transactions.description VARCHAR(160).
const MAX_DESCRIPTION_LENGTH = 160;
const MAX_IMPORT_ROWS = 1000;
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
            "Description must be 160 characters or less",
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
      // The category doesn't belong to this user or is the wrong kind.
      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid category for this transaction",
        });
      }

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

/*
 * POST /api/transactions/import
 * Body: { rows: [{ categoryId, type, amount, description, transactionDate, notes? }],
 *         skipDuplicates?: boolean }
 * All rows are validated first; if any row is invalid nothing is saved and
 * the response lists the problems by row number (1-based).
 */
router.post(
  "/import",
  requireAuth,
  importRateLimiter,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const { rows, skipDuplicates } = req.body ?? {};

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "There are no transactions to import",
        });
      }

      if (rows.length > MAX_IMPORT_ROWS) {
        return res.status(400).json({
          status: "error",
          message: "You can import up to 1,000 transactions at a time",
        });
      }

      const errors: { row: number; message: string }[] = [];
      const validRows: ImportTransactionRow[] = [];

      rows.forEach((row: unknown, index: number) => {
        const item = (
          row && typeof row === "object" ? row : {}
        ) as Record<string, unknown>;
        const amountMinor = convertToMinorUnits(item.amount);
        const description =
          typeof item.description === "string" ? item.description.trim() : "";
        const notes =
          typeof item.notes === "string" && item.notes.trim() !== ""
            ? item.notes.trim()
            : null;

        let message: string | null = null;

        if (!isValidUuid(item.categoryId)) {
          message = "Invalid category";
        } else if (item.type !== "income" && item.type !== "expense") {
          message = "Transaction type must be income or expense";
        } else if (amountMinor === null) {
          message =
            "Amount must be greater than zero and no more than 10 billion.";
        } else if (!description) {
          message = "Description is required";
        } else if (description.length > MAX_DESCRIPTION_LENGTH) {
          message = "Description must be 160 characters or less";
        } else if (!isValidDate(item.transactionDate)) {
          message =
            "Transaction date must be a valid date in YYYY-MM-DD format";
        } else if (notes && notes.length > MAX_NOTES_LENGTH) {
          message = "Notes must be 2,000 characters or less";
        }

        if (message !== null || amountMinor === null) {
          errors.push({ row: index + 1, message: message ?? "Invalid row" });
          return;
        }

        validRows.push({
          categoryId: item.categoryId as string,
          type: item.type as ImportTransactionRow["type"],
          amountMinor,
          description,
          transactionDate: item.transactionDate as string,
          notes,
        });
      });

      if (errors.length > 0) {
        return res.status(400).json({
          status: "error",
          message: "Some rows are invalid. Nothing was imported.",
          errors: errors.slice(0, 50),
        });
      }

      const result = await importTransactions({
        userId: req.userId,
        rows: validRows,
        skipDuplicates: skipDuplicates !== false,
      });

      return res.status(201).json({
        status: "success",
        ...result,
      });
    } catch (error) {
      // A category that isn't this user's, or the wrong kind for the row.
      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message:
            "One or more rows use a category that doesn't match. Nothing was imported.",
        });
      }

      console.error("Importing transactions failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to import transactions",
      });
    }
  },
);

export default router;