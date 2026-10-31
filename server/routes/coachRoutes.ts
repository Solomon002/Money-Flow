import { Router } from "express";

import {
  createCoachChat,
  getCoachChats,
  getCoachChat,
  deleteCoachChat,
  sendCoachMessage,
  countCoachMessagesThisMonth,
  FREE_COACH_MESSAGES_PER_MONTH,
} from "../services/coachChatService.js";

import { hasProAccess } from "../services/subscriptionService.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

import { coachRateLimiter } from "../middleware/rateLimitMiddleware.js";

import { isValidUuid } from "../utils/validation.js";
import { resolveLanguage } from "../utils/language.js";

const router = Router();

// Unknown or malformed ids are simply "not found".
router.param("chatId", (req, res, next, id) => {
  if (!isValidUuid(id)) {
    return res.status(404).json({
      status: "error",
      message: "Coach chat not found",
    });
  }

  next();
});

/*
 * GET /api/coach/usage
 *
 * How many Coach messages the user has left this month.
 */
router.get(
  "/usage",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const [isPro, used] = await Promise.all([
        hasProAccess(req.userId),
        countCoachMessagesThisMonth(req.userId),
      ]);

      return res.json({
        status: "success",
        isPro,
        used,
        limit: isPro ? null : FREE_COACH_MESSAGES_PER_MONTH,
      });
    } catch (error) {
      console.error("Failed to get Coach usage:", error);

      return res.status(500).json({
        status: "error",
        message: "Unable to load Coach usage",
      });
    }
  },
);

/*
 * GET /api/coach/chats
 *
 * Get all chats belonging to the
 * authenticated user.
 */
router.get(
  "/chats",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message:
            "Authentication required",
        });
      }

      const chats =
        await getCoachChats(
          req.userId,
        );

      return res.json({
        status: "success",
        chats,
      });
    } catch (error) {
      console.error(
        "Failed to get Coach chats:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to load Coach chats",
      });
    }
  },
);

/*
 * POST /api/coach/chats
 *
 * Create a new empty chat.
 */
router.post(
  "/chats",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message:
            "Authentication required",
        });
      }

      const chat =
        await createCoachChat(
          req.userId,
        );

      return res.status(201).json({
        status: "success",
        chat,
      });
    } catch (error) {
      console.error(
        "Failed to create Coach chat:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to create a new Coach chat",
      });
    }
  },
);

/*
 * GET /api/coach/chats/:chatId
 *
 * Get one chat and all its messages.
 */
router.get(
  "/chats/:chatId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message:
            "Authentication required",
        });
      }

      const chatId =
        String(req.params.chatId);

      const result =
        await getCoachChat(
          req.userId,
          chatId,
        );

      if (!result) {
        return res.status(404).json({
          status: "error",
          message:
            "Coach chat not found",
        });
      }

      return res.json({
        status: "success",
        chat: result.chat,
        messages: result.messages,
      });
    } catch (error) {
      console.error(
        "Failed to get Coach chat:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to load Coach chat",
      });
    }
  },
);

/*
 * DELETE /api/coach/chats/:chatId
 *
 * Delete a chat belonging to the
 * authenticated user.
 */
router.delete(
  "/chats/:chatId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message:
            "Authentication required",
        });
      }

      const chatId =
        String(req.params.chatId);

      const deleted =
        await deleteCoachChat(
          req.userId,
          chatId,
        );

      if (!deleted) {
        return res.status(404).json({
          status: "error",
          message:
            "Coach chat not found",
        });
      }

      return res.json({
        status: "success",
        message:
          "Coach chat deleted",
      });
    } catch (error) {
      console.error(
        "Failed to delete Coach chat:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to delete Coach chat",
      });
    }
  },
);

/*
 * POST /api/coach/chats/:chatId/messages
 *
 * Send a message inside an existing chat.
 */
router.post(
  "/chats/:chatId/messages",
  requireAuth,
  coachRateLimiter,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message:
            "Authentication required",
        });
      }

      const chatId =
        String(req.params.chatId);

      const {
        question,
      } = req.body;

      if (
        typeof question !== "string" ||
        question.trim().length === 0
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Question is required",
        });
      }

      if (
        question.trim().length > 1000
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Question must be 1000 characters or less",
        });
      }

      // Free plan: limited messages per calendar month. Checked on the
      // server so it can't be skipped by calling the API directly.
      if (!(await hasProAccess(req.userId))) {
        const used = await countCoachMessagesThisMonth(req.userId);

        if (used >= FREE_COACH_MESSAGES_PER_MONTH) {
          return res.status(403).json({
            status: "error",
            code: "coach_limit_reached",
            message:
              "You've used all your free MoneyFlow Coach messages this month. Upgrade to Pro for unlimited Coach.",
          });
        }
      }

      const result =
        await sendCoachMessage({
          userId:
            req.userId,
          chatId,
          question:
            question.trim(),
          language: resolveLanguage(
            req.headers["accept-language"],
          ),
        });

      if (!result.success) {
        return res.status(404).json({
          status: "error",
          message:
            "Coach chat not found",
        });
      }

      return res.json({
        status: "success",
        answer: result.answer,
        context: result.context,
        userMessage:
          result.userMessage,
        assistantMessage:
          result.assistantMessage,
        title: result.title,
      });
    } catch (error: any) {
      console.error(
        "MoneyFlow Coach failed:",
        error,
      );

      if (
        error?.message ===
        "GEMINI_API_KEY is not defined"
      ) {
        return res.status(503).json({
          status: "error",
          message:
            "MoneyFlow Coach is not configured yet.",
        });
      }

      if (
        error?.status === 429 ||
        error?.statusCode === 429 ||
        error?.code ===
          "too_many_requests"
      ) {
        return res.status(429).json({
          status: "error",
          message:
            "MoneyFlow Coach has reached its daily AI usage limit. Please try again later.",
        });
      }

      return res.status(500).json({
        status: "error",
        message:
          "Unable to get a response from MoneyFlow Coach",
      });
    }
  },
);

export default router;
