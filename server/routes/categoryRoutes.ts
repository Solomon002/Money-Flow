import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import { getCategories } from "../services/categoryService.js";

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

      const categories = await getCategories(req.userId);

      return res.status(200).json({
        status: "success",
        categories,
      });
    } catch (error) {
      console.error("Getting categories failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to get categories",
      });
    }
  }
);

export default router;