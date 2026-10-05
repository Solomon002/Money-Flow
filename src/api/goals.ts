import { apiRequest } from "./client.js";

export type GoalStatus =
  | "active"
  | "completed"
  | "paused"
  | "archived";

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount_minor: number;
  current_amount_minor: number;
  target_date: string | null;
  description: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

export async function getGoals() {
  return apiRequest("/api/goals", {
    method: "GET",
  });
}

export async function createGoal(data: {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  description: string | null;
}) {
  return apiRequest("/api/goals", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateGoal(
  goalId: string,
  data: {
    name: string;
    targetAmount: number;
    targetDate: string | null;
    description: string | null;
    status: GoalStatus;
  },
) {
  return apiRequest(`/api/goals/${goalId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function addMoneyToGoal(
  goalId: string,
  amount: number,
) {
  return apiRequest(
    `/api/goals/${goalId}/add-money`,
    {
      method: "POST",
      body: JSON.stringify({
        amount,
      }),
    },
  );
}

export async function deleteGoal(
  goalId: string,
) {
  return apiRequest(`/api/goals/${goalId}`, {
    method: "DELETE",
  });
}