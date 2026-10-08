import { apiRequest } from "./client.js";

export type NotificationType =
  | "budget_warning"
  | "goal_reminder"
  | "monthly_insight"
  | "recurring_payment"
  | "goal_completed"
  | "subscription_expiring";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  budget_id: string | null;
  goal_id: string | null;
  recurring_transaction_id: string | null;
  created_at: string;
};

export type NotificationsResponse = {
  status: "success";
  notifications: Notification[];
  unreadCount: number;
};

export async function getNotifications(): Promise<NotificationsResponse> {
  const result = await apiRequest(
    "/api/notifications",
    {
      method: "GET",
    },
  );

  return result.data;
}

export async function getUnreadNotificationCount(): Promise<{
  status: "success";
  unreadCount: number;
}> {
  const result = await apiRequest(
    "/api/notifications/unread-count",
    {
      method: "GET",
    },
  );

  return result.data;
}

export async function markNotificationAsRead(
  notificationId: string,
): Promise<{
  status: "success";
  notification: Notification;
}> {
  const result = await apiRequest(
    `/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    },
  );

  return result.data;
}

export async function markAllNotificationsAsRead(): Promise<{
  status: "success";
  updatedCount: number;
}> {
  const result = await apiRequest(
    "/api/notifications/read-all",
    {
      method: "PATCH",
    },
  );

  return result.data;
}

export async function deleteNotification(
  notificationId: string,
): Promise<{
  status: "success";
  message: string;
}> {
  const result = await apiRequest(
    `/api/notifications/${notificationId}`,
    {
      method: "DELETE",
    },
  );

  return result.data;
}