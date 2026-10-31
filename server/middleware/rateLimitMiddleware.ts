import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { AuthenticatedRequest } from "./authMiddleware.js";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many login attempts. Please try again later.",
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many registration attempts. Please try again later.",
  },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many password reset requests. Please try again later.",
  },
});

export const resetPasswordRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many password reset attempts. Please try again later.",
  },
});

// The feedback form is public, so keep it tight.
export const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many feedback submissions. Please try again later.",
  },
});

// Every Coach message is a paid AI call. Keyed per account
// (falls back to IP) so one user cannot burn the AI quota.
// Must run after requireAuth.
export const coachRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthenticatedRequest).userId ??
    ipKeyGenerator(req.ip ?? ""),
  message: {
    status: "error",
    message:
      "You've sent a lot of messages to MoneyFlow Coach. Please try again later.",
  },
});

export const refreshTokenRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Too many token refresh requests. Please try again later.",
  },
});