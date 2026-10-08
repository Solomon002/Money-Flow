import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  getReportSummary,
  getSpendingByCategory,
  getSpendingBreakdown,
} from "../services/reportService.js";

const router = Router();

function isValidDate(date: unknown): date is string {
  if (typeof date !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date
    .split("-")
    .map(Number);

  const parsedDate = new Date(
    year,
    month - 1,
    day,
  );

  return (
    parsedDate.getFullYear() === year &&
    parsedDate.getMonth() === month - 1 &&
    parsedDate.getDate() === day
  );
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

      const startDate = String(
        req.query.startDate || "",
      );

      const endDate = String(
        req.query.endDate || "",
      );

      if (!isValidDate(startDate)) {
        return res.status(400).json({
          status: "error",
          message: "A valid start date is required",
        });
      }

      if (!isValidDate(endDate)) {
        return res.status(400).json({
          status: "error",
          message: "A valid end date is required",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          status: "error",
          message:
            "Start date cannot be after end date",
        });
      }

      const [
        summary,
        spendingByCategory,
        spendingBreakdown,
      ] = await Promise.all([
        getReportSummary(
          req.userId,
          startDate,
          endDate,
        ),
        getSpendingByCategory(
          req.userId,
          startDate,
          endDate,
        ),
        getSpendingBreakdown(
          req.userId,
          startDate,
          endDate,
        ),
      ]);

      return res.json({
        status: "success",
        report: {
          startDate,
          endDate,
          summary,
          spendingByCategory,
          spendingBreakdown,
        },
      });
    } catch (error) {
      console.error("Getting report failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to load report",
      });
    }
  },
);

export default router;