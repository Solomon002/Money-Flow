import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
} from "../services/budgetService.js";

import {
  MAX_YEAR,
  MIN_YEAR,
  isClientInputDbError,
  isValidUuid,
  toMinorUnits,
} from "../utils/validation.js";

const router = Router();

// Unknown or malformed ids are simply "not found".
router.param("id", (req, res, next, id) => {
  if (!isValidUuid(id)) {
    return res.status(404).json({
      status: "error",
      message: "Budget not found",
    });
  }

  next();
});

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

      const budgets = await getBudgets(req.userId);

      return res.status(200).json({
        status: "success",
        budgets,
      });
    } catch (error) {
      console.error("Getting budgets failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to get budgets",
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
        monthlyAmount,
        month,
        year,
      } = req.body;

      if (!isValidUuid(categoryId)) {
        return res.status(400).json({
          status: "error",
          message: "Category is required",
        });
      }

      const monthlyAmountMinor = toMinorUnits(monthlyAmount);

      if (monthlyAmountMinor === null) {
        return res.status(400).json({
          status: "error",
          message:
            "Monthly budget must be greater than zero and no more than 10 billion",
        });
      }

      const monthNumber = Number(month);
      const yearNumber = Number(year);

      if (
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        return res.status(400).json({
          status: "error",
          message: "Month must be between 1 and 12",
        });
      }

      if (
        !Number.isInteger(yearNumber) ||
        yearNumber < MIN_YEAR ||
        yearNumber > MAX_YEAR
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid year",
        });
      }

      const budget = await createBudget({
        userId: req.userId,
        categoryId,
        monthlyAmountMinor,
        month: monthNumber,
        year: yearNumber,
      });

      return res.status(201).json({
        status: "success",
        message: "Budget created successfully",
        budget,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "23505"
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "A budget already exists for this category and month.",
        });
      }

      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid budget category",
        });
      }

      console.error("Creating budget failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to create budget",
      });
    }
  },
);

router.put(
  "/:id",
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
        monthlyAmount,
        month,
        year,
      } = req.body;

      if (!isValidUuid(categoryId)) {
        return res.status(400).json({
          status: "error",
          message: "Category is required",
        });
      }

      const monthlyAmountMinor = toMinorUnits(monthlyAmount);

      if (monthlyAmountMinor === null) {
        return res.status(400).json({
          status: "error",
          message:
            "Monthly budget must be greater than zero and no more than 10 billion",
        });
      }

      const monthNumber = Number(month);
      const yearNumber = Number(year);

      if (
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        return res.status(400).json({
          status: "error",
          message: "Month must be between 1 and 12",
        });
      }

      if (
        !Number.isInteger(yearNumber) ||
        yearNumber < MIN_YEAR ||
        yearNumber > MAX_YEAR
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid year",
        });
      }

      const budget = await updateBudget({
        userId: req.userId,
        budgetId: String(req.params.id),
        categoryId,
        monthlyAmountMinor,
        month: monthNumber,
        year: yearNumber,
      });

      if (!budget) {
        return res.status(404).json({
          status: "error",
          message: "Budget not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Budget updated successfully",
        budget,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "23505"
      ) {
        return res.status(409).json({
          status: "error",
          message:
            "A budget already exists for this category and month.",
        });
      }

      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid budget category",
        });
      }

      console.error("Updating budget failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to update budget",
      });
    }
  },
);

router.delete(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const budget = await deleteBudget(
        req.userId,
        String(req.params.id),
      );

      if (!budget) {
        return res.status(404).json({
          status: "error",
          message: "Budget not found",
        });
      }

      return res.status(200).json({
        status: "success",
        message: "Budget deleted successfully",
      });
    } catch (error) {
      console.error("Deleting budget failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to delete budget",
      });
    }
  },
);

export default router;