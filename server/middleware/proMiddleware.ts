import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "./authMiddleware.js";
import { hasProAccess } from "../services/subscriptionService.js";

export async function requirePro(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const isPro = await hasProAccess(req.userId);

    if (!isPro) {
      return res.status(403).json({
        status: "error",
        message:
          "MoneyFlow Pro is required for this feature",
      });
    }

    return next();
  } catch (error) {
    console.error(
      "Failed to verify Pro access:",
      error,
    );

    return res.status(500).json({
      status: "error",
      message: "Unable to verify Pro access",
    });
  }
}