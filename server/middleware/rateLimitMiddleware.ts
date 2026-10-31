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

// Per-account limit, so an attacker rotating IPs still can't brute-force
// one account. Only failed attempts count.
export const loginAccountRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    typeof req.body?.email === "string"
      ? `login:${req.body.email.trim().toLowerCase()}`
      : `login-ip:${ipKeyGenerator(req.ip ?? "")}`,
  message: {
    status: "error",
    message:
      "Too many login attempts for this account. Please try again later.",
  },
});

// Guards endpoints that check the current password of a signed-in user
// (change password, change email). Must run after requireAuth.
export const passwordCheckRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    (req as AuthenticatedRequest).userId ??
    ipKeyGenerator(req.ip ?? ""),
  message: {
    status: "error",
    message:
      "Too many password attempts. Please try again later.",
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

// Imports are heavy (up to 1,000 rows each). Must run after requireAuth.
export const importRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) =>
    (req as AuthenticatedRequest).userId ??
    ipKeyGenerator(req.ip ?? ""),
  message: {
    status: "error",
    message: "Too many imports. Please try again later.",
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