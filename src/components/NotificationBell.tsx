import { useEffect, useRef, useState } from "react";

import {
  deleteNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type Notification,
} from "../api/notifications.js";

function formatNotificationTime(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "budget_warning":
      return "⚠️";

    case "goal_reminder":
      return "🎯";

    case "monthly_insight":
      return "📊";

    case "recurring_payment":
      return "🔁";

    default:
      return "🔔";
  }
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [unreadCount, setUnreadCount] = useState(0);

  const [isOpen, setIsOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  const hasLoadedNotificationsRef = useRef(false);

  const knownNotificationIdsRef = useRef<Set<string>>(new Set());

  const audioContextRef = useRef<AudioContext | null>(null);

  function playNotificationSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        void audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);

      oscillator.frequency.setValueAtTime(988, audioContext.currentTime + 0.08);

      gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);

      gainNode.gain.exponentialRampToValueAtTime(
        0.12,
        audioContext.currentTime + 0.01,
      );

      gainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.25,
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();

      oscillator.stop(audioContext.currentTime + 0.25);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  }

  async function loadNotifications(
    showLoading = true,
    playSoundForNewNotifications = false,
  ) {
    try {
      if (showLoading) {
        setIsLoading(true);
      }

      setError("");

      const result = await getNotifications();

      const incomingNotifications = result.notifications;

      if (playSoundForNewNotifications && hasLoadedNotificationsRef.current) {
        const hasNewNotification = incomingNotifications.some(
          (notification) =>
            !knownNotificationIdsRef.current.has(notification.id),
        );

        if (hasNewNotification) {
          playNotificationSound();
        }
      }

      knownNotificationIdsRef.current = new Set(
        incomingNotifications.map((notification) => notification.id),
      );

      hasLoadedNotificationsRef.current = true;

      setNotifications(incomingNotifications);

      setUnreadCount(result.unreadCount);
    } catch (error) {
      console.error("Failed to load notifications:", error);

      setError("Unable to load notifications.");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadNotifications(true, false);

    const interval = window.setInterval(() => {
      void loadNotifications(false, true);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadNotifications(false, true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleMarkAsRead(notificationId: string) {
    try {
      const result = await markNotificationAsRead(notificationId);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? result.notification
            : notification,
        ),
      );

      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllNotificationsAsRead();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      await deleteNotification(notificationId);

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      knownNotificationIdsRef.current.delete(notificationId);

      if (notification && !notification.read_at) {
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);

          if (!isOpen) {
            void loadNotifications(false, false);
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed left-4 right-4 top-20 z-50 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-90">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {unreadCount} unread
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto sm:max-h-105">
            {isLoading && (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Loading notifications...
              </div>
            )}

            {!isLoading && error && (
              <div className="px-4 py-8 text-center text-sm text-red-500">
                {error}
              </div>
            )}

            {!isLoading && !error && notifications.length === 0 && (
              <div className="px-4 py-10 text-center">
                <div className="mb-2 text-3xl">🔔</div>

                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  No notifications
                </p>

                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  You're all caught up.
                </p>
              </div>
            )}

            {!isLoading &&
              !error &&
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-gray-100 px-4 py-4 last:border-b-0 dark:border-gray-800 ${
                    notification.read_at
                      ? "bg-white dark:bg-gray-900"
                      : "bg-blue-50/60 dark:bg-blue-950/20"
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="min-w-0 wrap-break-word text-sm font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>

                        <button
                          type="button"
                          onClick={() => handleDelete(notification.id)}
                          className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                          aria-label="Delete notification"
                        >
                          ✕
                        </button>
                      </div>

                      <p className="mt-1 wrap-break-word text-sm leading-5 text-gray-600 dark:text-gray-300">
                        {notification.message}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">
                          {formatNotificationTime(notification.created_at)}
                        </span>

                        {!notification.read_at && (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
