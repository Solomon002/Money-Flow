import { pool } from "../db.js";
import {
  askMoneyFlowCoach,
  type CoachMessage,
} from "./coachService.js";

type ChatMessageRow = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

function createChatTitle(question: string): string {
  const cleaned = question
    .trim()
    .replace(/\s+/g, " ");

  if (cleaned.length <= 45) {
    return cleaned;
  }

  return `${cleaned.slice(0, 42)}...`;
}

export async function createCoachChat(
  userId: string,
) {
  const result = await pool.query(
    `
      INSERT INTO public.coach_chats (
        user_id,
        title
      )
      VALUES ($1, $2)
      RETURNING
        id,
        user_id,
        title,
        created_at,
        updated_at
    `,
    [
      userId,
      "New Chat",
    ],
  );

  return result.rows[0];
}

export async function getCoachChats(
  userId: string,
) {
  const result = await pool.query(
    `
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,

        (
          SELECT COUNT(*)
          FROM public.coach_messages m
          WHERE m.chat_id = c.id
        )::INTEGER AS message_count

      FROM public.coach_chats c

      WHERE c.user_id = $1

      ORDER BY c.updated_at DESC
    `,
    [userId],
  );

  return result.rows;
}

export async function getCoachChat(
  userId: string,
  chatId: string,
) {
  const chatResult = await pool.query(
    `
      SELECT
        id,
        user_id,
        title,
        created_at,
        updated_at
      FROM public.coach_chats
      WHERE id = $1
        AND user_id = $2
    `,
    [
      chatId,
      userId,
    ],
  );

  if (chatResult.rows.length === 0) {
    return null;
  }

  const messagesResult =
    await pool.query<ChatMessageRow>(
      `
        SELECT
          id,
          chat_id,
          role,
          content,
          created_at
        FROM public.coach_messages
        WHERE chat_id = $1
        ORDER BY created_at ASC
      `,
      [chatId],
    );

  return {
    chat: chatResult.rows[0],
    messages: messagesResult.rows,
  };
}

export async function deleteCoachChat(
  userId: string,
  chatId: string,
) {
  const result = await pool.query(
    `
      DELETE FROM public.coach_chats
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [
      chatId,
      userId,
    ],
  );

  return result.rows.length > 0;
}

export async function sendCoachMessage({
  userId,
  chatId,
  question,
}: {
  userId: string;
  chatId: string;
  question: string;
}) {
  const client = await pool.connect();

  try {
    const chatResult = await client.query(
      `
        SELECT
          id,
          title
        FROM public.coach_chats
        WHERE id = $1
          AND user_id = $2
      `,
      [
        chatId,
        userId,
      ],
    );

    if (chatResult.rows.length === 0) {
      return {
        success: false,
        reason: "chat_not_found",
      } as const;
    }

    const existingMessagesResult =
      await client.query<ChatMessageRow>(
        `
          SELECT
            id,
            chat_id,
            role,
            content,
            created_at
          FROM public.coach_messages
          WHERE chat_id = $1
          ORDER BY created_at ASC
        `,
        [chatId],
      );

    const existingMessages =
      existingMessagesResult.rows;

    const conversation: CoachMessage[] =
      existingMessages
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

    const userMessageResult =
      await client.query<ChatMessageRow>(
        `
          INSERT INTO public.coach_messages (
            chat_id,
            role,
            content
          )
          VALUES ($1, 'user', $2)
          RETURNING
            id,
            chat_id,
            role,
            content,
            created_at
        `,
        [
          chatId,
          question,
        ],
      );

    const userMessage =
      userMessageResult.rows[0];

    let aiResult;

    try {
      aiResult = await askMoneyFlowCoach(
        userId,
        question,
        conversation,
      );
    } catch (error) {
      await client.query(
        `
          DELETE FROM public.coach_messages
          WHERE id = $1
        `,
        [userMessage.id],
      );

      throw error;
    }

    const assistantMessageResult =
      await client.query<ChatMessageRow>(
        `
          INSERT INTO public.coach_messages (
            chat_id,
            role,
            content
          )
          VALUES ($1, 'assistant', $2)
          RETURNING
            id,
            chat_id,
            role,
            content,
            created_at
        `,
        [
          chatId,
          aiResult.answer,
        ],
      );

    const assistantMessage =
      assistantMessageResult.rows[0];

    const currentTitle =
      chatResult.rows[0].title;

    const newTitle =
      currentTitle === "New Chat"
        ? createChatTitle(question)
        : currentTitle;

    await client.query(
      `
        UPDATE public.coach_chats
        SET
          title = $1,
          updated_at = NOW()
        WHERE id = $2
          AND user_id = $3
      `,
      [
        newTitle,
        chatId,
        userId,
      ],
    );

    return {
      success: true,
      answer: aiResult.answer,
      context: aiResult.context,
      userMessage,
      assistantMessage,
      title: newTitle,
    } as const;
  } finally {
    client.release();
  }
}