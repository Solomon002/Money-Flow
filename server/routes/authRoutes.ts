import { Router } from "express";
import { Resend } from "resend";

import { loginUser, registerUser } from "../services/authService.js";

import {
  createSession,
  refreshAccessToken,
  revokeSession,
} from "../services/sessionService.js";

import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  resetPasswordRateLimiter,
  refreshTokenRateLimiter,
} from "../middleware/rateLimitMiddleware.js";

import {
  createPasswordResetToken,
  resetPassword,
} from "../services/passwordResetService.js";

import {
  AuthenticatedRequest,
  requireAuth,
} from "../middleware/authMiddleware.js";

import { pool } from "../db.js";

const router = Router();

const resendApiKey = process.env.RESEND_API_KEY;
const feedbackEmail = process.env.FEEDBACK_EMAIL;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const resend = resendApiKey ? new Resend(resendApiKey) : null;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

router.post(
  "/register",
  registerRateLimiter,
  async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid email address",
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        status: "error",
        message:
          "Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const user = await registerUser({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    return res.status(201).json({
      status: "ok",
      message: "Account created successfully",
      user,
    });
  } catch (error) {
    console.error("Registration failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to create account",
    });
  }
});

router.post(
  "/login",
  loginRateLimiter,
  async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid email address",
      });
    }

    const user = await loginUser({
      email: normalizedEmail,
      password,
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const { session, accessToken, refreshToken } =
      await createSession(user.id);

    return res.status(200).json({
      status: "ok",
      message: "Login successful",
      user,
      accessToken,
      refreshToken,
      session: {
        id: session.id,
        expiresAt: session.expires_at,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to log in",
    });
  }
});

router.post(
  "/refresh",
  refreshTokenRateLimiter,
  async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required",
      });
    }

    const accessToken = await refreshAccessToken(refreshToken);

    if (!accessToken) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }

    return res.status(200).json({
      status: "ok",
      accessToken,
    });
  } catch (error) {
    console.error("Token refresh failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to refresh access token",
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required",
      });
    }

    const sessionWasRevoked = await revokeSession(refreshToken);

    if (!sessionWasRevoked) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or already revoked refresh token",
      });
    }

    return res.status(200).json({
      status: "ok",
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to log out",
    });
  }
});

router.get(
  "/me",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await pool.query(
        `
          SELECT
            id,
            name,
            email,
            created_at
          FROM public.users
          WHERE id = $1
        `,
        [req.userId],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      return res.status(200).json({
        status: "ok",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Fetching current user failed:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to fetch current user",
      });
    }
  },
);

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid email address",
      });
    }

    const result = await pool.query(
      `
        SELECT id
        FROM public.users
        WHERE email = $1
      `,
      [normalizedEmail],
    );

    /*
     * Always return the same response whether or not
     * the email exists. This prevents account enumeration.
     */
    if (result.rows.length === 0) {
      return res.status(200).json({
        status: "ok",
        message:
          "If an account exists with that email, a password reset link has been sent",
      });
    }

    const { resetToken, email: userEmail, tokenRecord } =
      await createPasswordResetToken(result.rows[0].id);

    if (!resend || !feedbackEmail) {
      console.error(
        "Password reset email cannot be sent because Resend is not configured",
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to send password reset email",
      });
    }

    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const emailResult = await resend.emails.send({
      from: "MoneyFlow <onboarding@resend.dev>",
      to: userEmail,
      subject: "Reset your MoneyFlow password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto;">
          <h2>Reset your MoneyFlow password</h2>

          <p>
            We received a request to reset your MoneyFlow password.
          </p>

          <p>
            Click the button below to create a new password.
          </p>

          <p style="margin: 28px 0;">
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                padding: 12px 20px;
                background: #0f172a;
                color: #ffffff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              "
            >
              Reset password
            </a>
          </p>

          <p>
            This link will expire in 30 minutes.
          </p>

          <p style="color: #64748b; font-size: 13px;">
            If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (emailResult.error) {
      console.error(
        "Sending password reset email failed:",
        emailResult.error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to send password reset email",
      });
    }

    console.log(
      `Password reset email sent successfully. Token expires at ${tokenRecord.expires_at}`,
    );

    return res.status(200).json({
      status: "ok",
      message:
        "If an account exists with that email, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Password reset request failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to process password reset request",
    });
  }
});

router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Reset token and new password are required",
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        status: "error",
        message:
          "Password must be at least 8 characters and contain one uppercase letter, one lowercase letter, one number, and one special character",
      });
    }

    const passwordWasReset = await resetPassword(
      token,
      newPassword,
    );

    if (!passwordWasReset) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired password reset token",
      });
    }

    return res.status(200).json({
      status: "ok",
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Password reset failed:", error);

    return res.status(500).json({
      status: "error",
      message: "Unable to reset password",
    });
  }
});

export default router;