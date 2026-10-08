import { Router } from "express";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  checkGoalReminders,
  checkSubscriptionReminder,
} from "../services/notificationService.js";

import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      try {
        await checkGoalReminders(req.userId);
      } catch (error) {
        console.error(
          "Checking goal reminders failed:",
          error,
        );
      }

      try {
        await checkSubscriptionReminder(req.userId);
      } catch (error) {
        console.error(
          "Checking subscription reminder failed:",
          error,
        );
      }

      const notifications =
        await getNotifications(req.userId);

      const unreadCount =
        await getUnreadNotificationCount(
          req.userId,
        );

      return res.json({
        status: "success",
        notifications,
        unreadCount,
      });
    } catch (error) {
      console.error(
        "Failed to get notifications:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message: "Unable to load notifications",
      });
    }
  },
);

router.get(
  "/unread-count",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const unreadCount =
        await getUnreadNotificationCount(
          req.userId,
        );

      return res.json({
        status: "success",
        unreadCount,
      });
    } catch (error) {
      console.error(
        "Failed to get unread notification count:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to load unread notification count",
      });
    }
  },
);

router.patch(
  "/:notificationId/read",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const notificationId = String(
        req.params.notificationId,
      );

      const notification =
        await markNotificationAsRead(
          req.userId,
          notificationId,
        );

      if (!notification) {
        return res.status(404).json({
          status: "error",
          message: "Notification not found",
        });
      }

      return res.json({
        status: "success",
        notification,
      });
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to update notification",
      });
    }
  },
);

router.patch(
  "/read-all",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      await markAllNotificationsAsRead(
        req.userId,
      );

      return res.json({
        status: "success",
        updatedCount: 0,
      });
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to update notifications",
      });
    }
  },
);

router.delete(
  "/:notificationId",
  requireAuth,
  async (
    req: AuthenticatedRequest,
    res,
  ) => {
    try {
      if (!req.userId) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const notificationId = String(
        req.params.notificationId,
      );

      const deleted =
        await deleteNotification(
          req.userId,
          notificationId,
        );

      if (!deleted) {
        return res.status(404).json({
          status: "error",
          message: "Notification not found",
        });
      }

      return res.json({
        status: "success",
        message: "Notification deleted",
      });
    } catch (error) {
      console.error(
        "Failed to delete notification:",
        error,
      );

      return res.status(500).json({
        status: "error",
        message:
          "Unable to delete notification",
      });
    }
  },
);

export default router;