import { Router } from "express";

import {
  getSettings,
  updateSettings,
} from "../services/settingsService.js";

import {
  changePassword,
  verifyEmailChange,
} from "../services/authService.js";

import { passwordCheckRateLimiter } from "../middleware/rateLimitMiddleware.js";

import {
  ALLOWED_CURRENCIES,
  MAX_NAME_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  isValidEmail,
  toMinorUnits,
} from "../utils/validation.js";

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
  passwordCheckRateLimiter,
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

      if (name.trim().length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          status: "error",
          message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
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

      if (!isValidEmail(email.trim().toLowerCase())) {
        return res.status(400).json({
          status: "error",
          message: "Please enter a valid email address",
        });
      }

      if (
        typeof currencyCode !== "string" ||
        !ALLOWED_CURRENCIES.includes(currencyCode)
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
        (typeof incomeSource !== "string" ||
          incomeSource.trim().length > MAX_SHORT_TEXT_LENGTH)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid income source",
        });
      }

      if (
        monthlyIncome !== null &&
        monthlyIncome !== undefined &&
        toMinorUnits(monthlyIncome, { allowZero: true }) === null
      ) {
        return res.status(400).json({
          status: "error",
          message: "Invalid monthly income",
        });
      }

      if (
        monthlySavingsTarget !== null &&
        monthlySavingsTarget !== undefined &&
        toMinorUnits(monthlySavingsTarget, { allowZero: true }) ===
          null
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
        (typeof financialObjective !== "string" ||
          financialObjective.trim().length > MAX_SHORT_TEXT_LENGTH)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Invalid financial objective",
        });
      }

      /*
       * Changing the email needs the current password. Otherwise a
       * stolen session could switch the email to the attacker's and
       * then use "forgot password" to take the account over.
       */
      const emailCheck = await verifyEmailChange({
        userId: req.userId,
        newEmail: email.trim().toLowerCase(),
        currentPassword: req.body.currentPassword,
      });

      if (emailCheck === "password_required") {
        return res.status(403).json({
          status: "error",
          message:
            "Enter your current password to change your email address",
        });
      }

      if (emailCheck === "password_not_set") {
        return res.status(400).json({
          status: "error",
          message:
            "Set a password first (use \"Forgot password\") before changing your email address",
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
  passwordCheckRateLimiter,
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
        return res.status(403).json({
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