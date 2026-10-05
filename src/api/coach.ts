import { apiRequest } from "./client.js";

export type CoachMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export type CoachChat = {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
};

export type CoachContext = {
  currencyCode: string;
  currentMonth: string;
  previousMonth: string;
};

export type CoachResponse = {
  status: "success";
  answer: string;
  context: CoachContext;
};

export async function getCoachChats(): Promise<{
  status: "success";
  chats: CoachChat[];
}> {
  const result = await apiRequest(
    "/api/coach/chats",
    {
      method: "GET",
    },
  );

  return result.data;
}

export async function createCoachChat(): Promise<{
  status: "success";
  chat: CoachChat;
}> {
  const result = await apiRequest(
    "/api/coach/chats",
    {
      method: "POST",
    },
  );

  return result.data;
}

export async function getCoachChat(
  chatId: string,
): Promise<{
  status: "success";
  chat: CoachChat;
  messages: CoachMessage[];
}> {
  const result = await apiRequest(
    `/api/coach/chats/${chatId}`,
    {
      method: "GET",
    },
  );

  return result.data;
}

export async function deleteCoachChat(
  chatId: string,
): Promise<{
  status: "success";
  message: string;
}> {
  const result = await apiRequest(
    `/api/coach/chats/${chatId}`,
    {
      method: "DELETE",
    },
  );

  return result.data;
}

export async function sendCoachMessage(
  chatId: string,
  question: string,
): Promise<{
  status: "success";
  answer: string;
  context: CoachContext;
  userMessage: CoachMessage;
  assistantMessage: CoachMessage;
  title: string;
}> {
  const result = await apiRequest(
    `/api/coach/chats/${chatId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        question,
      }),
    },
  );

  return result.data;
}