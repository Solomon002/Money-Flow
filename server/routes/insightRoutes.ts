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

export default router;