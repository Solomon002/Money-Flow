import { Router } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";
import {
  createCategory,
  getCategories,
} from "../services/categoryService.js";

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

      const { name, kind, parentId } = req.body;

      if (typeof name !== "string") {
        return res.status(400).json({
          status: "error",
          message: "Category name is required",
        });
      }

      if (kind !== "income" && kind !== "expense") {
        return res.status(400).json({
          status: "error",
          message: "Category kind must be income or expense",
        });
      }

      if (
        parentId !== undefined &&
        parentId !== null &&
        typeof parentId !== "string"
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid parent category",
        });
      }

      const category = await createCategory(
        req.userId,
        name,
        kind,
        parentId ?? null
      );

      return res.status(201).json({
        status: "success",
        category,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create category";

      console.error("Creating category failed:", error);

      return res.status(400).json({
        status: "error",
        message,
      });
    }
  }
);

export default router;