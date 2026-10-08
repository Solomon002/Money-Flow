import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { requirePro } from "../middleware/proMiddleware.js";
import {
  getAdvancedAnalytics,
  getAdvancedReport,
} from "../services/advancedReportService.js";

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
  requirePro,
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

      const report = await getAdvancedReport(
        req.userId,
        startDate,
        endDate,
      );

      return res.status(200).json({
        status: "success",
        report,
      });
    } catch (error) {
      console.error(
        "Getting advanced report failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to load advanced report",
      });
    }
  },
);

router.get(
  "/analytics",
  requireAuth,
  requirePro,
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

      const analytics = await getAdvancedAnalytics(
        req.userId,
        startDate,
        endDate,
      );

      return res.status(200).json({
        status: "success",
        analytics,
      });
    } catch (error) {
      console.error(
        "Getting advanced analytics failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to load advanced analytics",
      });
    }
  },
);

export default router;