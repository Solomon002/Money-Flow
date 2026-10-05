import { Router } from "express";

import {
  getSettings,
  updateSettings,
} from "../services/settingsService.js";

import {
  changePassword,
} from "../services/authService.js";

import {
  revokeAllUserSessions,
} from "../services/sessionService.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

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

      const settings = await getSettings(req.userId);

      if (!settings) {
        return res.status(404).json({
          status: "error",
          message: "Settings not found",
        });
      }

      return res.json({
        status: "success",
        settings,
      });
    } catch (error) {
      console.error(
        "Getting settings failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to load settings",
      });
    }
  },
);

router.put(
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
        email,
        currencyCode,
        incomeSource,
        monthlyIncome,
        monthlySavingsTarget,
        financialObjective,
        appearance,
        budgetAlertsEnabled,
        goalRemindersEnabled,
        monthlyInsightsEnabled,
        recurringRemindersEnabled,
      } = req.body;

      if (
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Name is required",
        });
      }

      if (
        typeof email !== "string" ||
        email.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Email is required",
        });
      }

      const allowedCurrencies = [
        "NGN",
        "USD",
        "GBP",
        "EUR",
      ];

      if (
        typeof currencyCode !== "string" ||
        !allowedCurrencies.includes(currencyCode)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid currency",
        });
      }

      const allowedAppearances = [
        "light",
        "dark",
        "system",
      ];

      if (
        typeof appearance !== "string" ||
        !allowedAppearances.includes(appearance)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid appearance setting",
        });
      }

      if (
        typeof budgetAlertsEnabled !== "boolean" ||
        typeof goalRemindersEnabled !== "boolean" ||
        typeof monthlyInsightsEnabled !== "boolean" ||
        typeof recurringRemindersEnabled !== "boolean"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid notification settings",
        });
      }

      if (
        incomeSource !== null &&
        incomeSource !== undefined &&
        typeof incomeSource !== "string"
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid income source",
        });
      }

      if (
        monthlyIncome !== null &&
        monthlyIncome !== undefined &&
        (typeof monthlyIncome !== "number" ||
          !Number.isFinite(monthlyIncome) ||
          monthlyIncome < 0)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid monthly income",
        });
      }

      if (
        monthlySavingsTarget !== null &&
        monthlySavingsTarget !== undefined &&
        (typeof monthlySavingsTarget !== "number" ||
          !Number.isFinite(monthlySavingsTarget) ||
          monthlySavingsTarget < 0)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid monthly savings target",
        });
      }

      if (
        financialObjective !== null &&
        financialObjective !== undefined &&
        typeof financialObjective !== "string"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid financial objective",
        });
      }

      try {
        const settings = await updateSettings({
          userId: req.userId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          currencyCode,
          incomeSource:
            typeof incomeSource === "string"
              ? incomeSource.trim() || null
              : null,
          monthlyIncomeMinor:
  monthlyIncome === null ||
  monthlyIncome === undefined
    ? null
    : Math.round(monthlyIncome * 100),

monthlySavingsTargetMinor:
  monthlySavingsTarget === null ||
  monthlySavingsTarget === undefined
    ? null
    : Math.round(
        monthlySavingsTarget * 100,
      ),
          financialObjective:
            typeof financialObjective === "string"
              ? financialObjective.trim() || null
              : null,
          appearance:
            appearance as
              | "light"
              | "dark"
              | "system",
          budgetAlertsEnabled,
          goalRemindersEnabled,
          monthlyInsightsEnabled,
          recurringRemindersEnabled,
        });

        return res.json({
          status: "success",
          settings,
        });
      } catch (error: any) {
        if (error?.code === "P0001") {
          return res.status(400).json({
            status: "error",
            message:
              "Currency cannot be changed after financial amounts have been recorded.",
          });
        }

        if (error?.code === "23505") {
          return res.status(409).json({
            status: "error",
            message:
              "That email address is already in use.",
          });
        }

        throw error;
      }
    } catch (error) {
      console.error(
        "Updating settings failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to update settings",
      });
    }
  },
);

router.put(
  "/password",
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
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body;

      if (
        typeof currentPassword !== "string" ||
        currentPassword.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Current password is required",
        });
      }

      if (
        typeof newPassword !== "string" ||
        newPassword.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "New password is required",
        });
      }

      if (
        typeof confirmPassword !== "string" ||
        confirmPassword.length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Please confirm your new password",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          status: "error",
          message:
            "Password must be at least 8 characters long",
        });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({
          status: "error",
          message:
            "Password must contain at least one uppercase letter",
        });
      }

      if (!/[a-z]/.test(newPassword)) {
        return res.status(400).json({
          status: "error",
          message:
            "Password must contain at least one lowercase letter",
        });
      }

      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({
          status: "error",
          message:
            "Password must contain at least one number",
        });
      }

      if (!/[^A-Za-z0-9]/.test(newPassword)) {
        return res.status(400).json({
          status: "error",
          message:
            "Password must contain at least one special character",
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          status: "error",
          message:
            "New passwords do not match",
        });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({
          status: "error",
          message:
            "New password must be different from your current password",
        });
      }

      const result =
        await changePassword({
          userId: req.userId,
          currentPassword,
          newPassword,
        });

      if (
        !result.success &&
        result.reason === "user_not_found"
      ) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      if (
        !result.success &&
        result.reason ===
          "invalid_current_password"
      ) {
        return res.status(401).json({
          status: "error",
          message:
            "Current password is incorrect",
        });
      }

      await revokeAllUserSessions(
        req.userId,
      );

      return res.json({
        status: "success",
        message:
          "Password changed successfully. Please sign in again.",
      });
    } catch (error) {
      console.error(
        "Changing password failed:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to change password",
      });
    }
  },
);

export default router;