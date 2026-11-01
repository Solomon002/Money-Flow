import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  createGoal,
  getGoals,
  updateGoal,
  addMoneyToGoal,
  deleteGoal,
} from "../services/goalService.js";

import {
  MAX_LONG_TEXT_LENGTH,
  MAX_NAME_LENGTH,
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
      message: "Goal not found",
    });
  }

  next();
});

function convertToMinorUnits(amount: unknown) {
  return toMinorUnits(amount);
}

function invalidGoalText(
  name: string,
  description: unknown,
): string | null {
  if (name.trim().length > MAX_NAME_LENGTH) {
    return `Goal name must be ${MAX_NAME_LENGTH} characters or less`;
  }

  if (
    typeof description === "string" &&
    description.length > MAX_LONG_TEXT_LENGTH
  ) {
    return `Description must be ${MAX_LONG_TEXT_LENGTH} characters or less`;
  }

  return null;
}

function isValidDate(date: unknown) {
  if (typeof date !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  // Parse as UTC; local-time parsing shifts the day in UTC+ timezones.
  const parsedDate = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.toISOString().slice(0, 10) === date;
}

function isPastDate(date: string) {
  const today = new Date();

  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return date < todayString;
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

      const goals = await getGoals(req.userId);

      return res.json({
        status: "success",
        goals,
      });
    } catch (error) {
      console.error("Getting goals failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to load goals",
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
        name,
        targetAmount,
        currentAmount,
        targetDate,
        description,
      } = req.body;

      if (
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Goal name is required",
        });
      }

      const targetAmountMinor =
        convertToMinorUnits(targetAmount);

      if (targetAmountMinor === null) {
        return res.status(400).json({
          status: "error",
          message: "Target amount must be greater than 0",
        });
      }

      const textError = invalidGoalText(name, description);

      if (textError) {
        return res.status(400).json({
          status: "error",
          message: textError,
        });
      }

      const roundedCurrentAmountMinor =
        currentAmount === undefined ||
        currentAmount === null ||
        currentAmount === ""
          ? 0
          : toMinorUnits(currentAmount, { allowZero: true });

      if (roundedCurrentAmountMinor === null) {
        return res.status(400).json({
          status: "error",
          message: "Current amount cannot be negative",
        });
      }

      if (
        roundedCurrentAmountMinor > targetAmountMinor
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Current amount cannot be greater than the target amount",
        });
      }

      if (
        targetDate !== null &&
        targetDate !== undefined &&
        targetDate !== ""
      ) {
        if (!isValidDate(targetDate)) {
          return res.status(400).json({
            status: "error",
            message: "Target date must be a valid date",
          });
        }

        if (isPastDate(targetDate)) {
          return res.status(400).json({
            status: "error",
            message:
              "Target date cannot be in the past",
          });
        }
      }

      const goal = await createGoal({
        userId: req.userId,
        name: name.trim(),
        targetAmountMinor,
        currentAmountMinor: roundedCurrentAmountMinor,
        targetDate:
          targetDate === "" ? null : targetDate || null,
        description:
          typeof description === "string" &&
          description.trim().length > 0
            ? description.trim()
            : null,
      });

      return res.status(201).json({
        status: "success",
        message: "Goal created successfully",
        goal,
      });
    } catch (error) {
      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid goal details",
        });
      }

      console.error("Creating goal failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to create goal",
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

      const goalId = String(req.params.id);

      const {
        name,
        targetAmount,
        targetDate,
        description,
        status,
      } = req.body;

      if (
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Goal name is required",
        });
      }

      const targetAmountMinor =
        convertToMinorUnits(targetAmount);

      if (targetAmountMinor === null) {
        return res.status(400).json({
          status: "error",
          message: "Target amount must be greater than 0",
        });
      }

      const validStatuses = [
        "active",
        "completed",
        "paused",
        "archived",
      ];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid goal status",
        });
      }

      const textError = invalidGoalText(name, description);

      if (textError) {
        return res.status(400).json({
          status: "error",
          message: textError,
        });
      }

      if (
        targetDate !== null &&
        targetDate !== undefined &&
        targetDate !== ""
      ) {
        if (!isValidDate(targetDate)) {
          return res.status(400).json({
            status: "error",
            message: "Target date must be a valid date",
          });
        }

        if (isPastDate(targetDate)) {
          return res.status(400).json({
            status: "error",
            message:
              "Target date cannot be in the past",
          });
        }
      }

      const goal = await updateGoal({
        userId: req.userId,
        goalId,
        name: name.trim(),
        targetAmountMinor,
        targetDate:
          targetDate === "" ? null : targetDate || null,
        description:
          typeof description === "string" &&
          description.trim().length > 0
            ? description.trim()
            : null,
        status,
      });

      if (!goal) {
        return res.status(404).json({
          status: "error",
          message: "Goal not found",
        });
      }

      return res.json({
        status: "success",
        message: "Goal updated successfully",
        goal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { code?: string }).code ===
          "GOAL_NOT_COMPLETED"
      ) {
        return res.status(400).json({
          status: "error",
          message: error.message,
        });
      }

      console.error("Updating goal failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to update goal",
      });
    }
  },
);

router.post(
  "/:id/add-money",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const goalId = String(req.params.id);

      const amountMinor = convertToMinorUnits(
        req.body.amount,
      );

      if (amountMinor === null) {
        return res.status(400).json({
          status: "error",
          message: "Amount must be greater than 0",
        });
      }

      const goal = await addMoneyToGoal(
        req.userId,
        goalId,
        amountMinor,
      );

      if (!goal) {
        return res.status(404).json({
          status: "error",
          message: "Goal not found",
        });
      }

      return res.json({
        status: "success",
        message: "Money added to goal successfully",
        goal,
      });
    } catch (error) {
      if (isClientInputDbError(error)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid amount",
        });
      }

      console.error("Adding money to goal failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to add money to goal",
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

      const goalId = String(req.params.id);

      const goal = await deleteGoal(
        req.userId,
        goalId,
      );

      if (!goal) {
        return res.status(404).json({
          status: "error",
          message: "Goal not found",
        });
      }

      return res.json({
        status: "success",
        message: "Goal deleted successfully",
      });
    } catch (error) {
      console.error("Deleting goal failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to delete goal",
      });
    }
  },
);

export default router;