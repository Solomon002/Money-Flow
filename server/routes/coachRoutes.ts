import { Router } from "express";

import {
  askMoneyFlowCoach,
} from "../services/coachService.js";

import {
  createCoachChat,
  getCoachChats,
  getCoachChat,
  deleteCoachChat,
  sendCoachMessage,
} from "../services/coachChatService.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

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

      const result =
        await sendCoachMessage({
          userId:
            req.userId,
          chatId,
          question:
            question.trim(),
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

/*
 * POST /api/coach/ask
 *
 * Existing Coach endpoint.
 *
 * Kept temporarily so the current frontend
 * does not break while we build the new
 * persistent-chat frontend.
 */
router.post(
  "/ask",
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

      const {
        question,
        conversation,
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

      if (
        conversation !== undefined &&
        !Array.isArray(conversation)
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Conversation must be an array",
        });
      }

      const cleanedConversation =
        (conversation ?? [])
          .filter(
            (message: unknown) => {
              if (
                typeof message !==
                  "object" ||
                message === null
              ) {
                return false;
              }

              const item =
                message as {
                  role?: unknown;
                  content?: unknown;
                };

              return (
                (item.role === "user" ||
                  item.role ===
                    "assistant") &&
                typeof item.content ===
                  "string" &&
                item.content.trim()
                  .length > 0
              );
            },
          )
          .slice(-12);

      const result =
        await askMoneyFlowCoach(
          req.userId,
          question.trim(),
          cleanedConversation,
        );

      return res.json({
        status: "success",
        answer: result.answer,
        context: result.context,
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
