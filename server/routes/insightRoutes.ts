import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  getInsightData,
  getTopSpendingCategories,
  getBudgetInsights,
} from "../services/insightService.js";
import { requirePro } from "../middleware/proMiddleware.js";
import { getProInsights } from "../services/proInsightsService.js";

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

      const [
        insightData,
        topSpendingCategories,
        budgetInsights,
      ] = await Promise.all([
        getInsightData(req.userId),
        getTopSpendingCategories(req.userId),
        getBudgetInsights(req.userId),
      ]);

      return res.json({
        status: "success",
        insights: {
          ...insightData,
          topSpendingCategories,
          budgetInsights,
        },
      });
    } catch (error) {
      console.error(
        "Getting insights failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to load insights",
      });
    }
  },
);

/*
 * GET /api/insights/pro (MoneyFlow Pro)
 * Recurring payments and a projection for the current month.
 */
router.get(
  "/pro",
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

      const insights = await getProInsights(req.userId);

      return res.json({
        status: "success",
        ...insights,
      });
    } catch (error) {
      console.error("Getting Pro insights failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to load insights",
      });
    }
  },
);

export default router;