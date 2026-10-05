import { FormEvent, useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User,
} from "lucide-react";

import {
  createCoachChat,
  deleteCoachChat,
  getCoachChat,
  getCoachChats,
  sendCoachMessage,
  type CoachChat,
  type CoachMessage,
} from "../api/coach.js";

function CoachPage() {
  const [chats, setChats] = useState<CoachChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadChats() {
    try {
      setLoadingChats(true);
      setError(null);

      const result = await getCoachChats();

      setChats(result.chats);

      if (result.chats.length > 0 && !selectedChatId) {
        setSelectedChatId(result.chats[0].id);
      }
    } catch (error) {
      console.error("Failed to load Coach chats:", error);
      setError("Unable to load your Coach chats.");
    } finally {
      setLoadingChats(false);
    }
  }

  async function loadChat(chatId: string) {
    try {
      setLoadingChat(true);
      setError(null);

      const result = await getCoachChat(chatId);

      setMessages(result.messages);
    } catch (error) {
      console.error("Failed to load Coach chat:", error);
      setError("Unable to load this Coach chat.");
    } finally {
      setLoadingChat(false);
    }
  }

  useEffect(() => {
    void loadChats();
  }, []);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    void loadChat(selectedChatId);
  }, [selectedChatId]);

  async function handleNewChat() {
    try {
      setCreatingChat(true);
      setError(null);

      const result = await createCoachChat();

      setChats((current) => [result.chat, ...current]);

      setSelectedChatId(result.chat.id);
      setMessages([]);
      setQuestion("");
    } catch (error) {
      console.error("Failed to create Coach chat:", error);
      setError("Unable to create a new chat.");
    } finally {
      setCreatingChat(false);
    }
  }

  async function handleDeleteChat() {
    if (!selectedChatId) {
      return;
    }

    const confirmed = window.confirm("Delete this Coach chat?");

    if (!confirmed) {
      return;
    }

    try {
      setDeletingChat(true);
      setError(null);

      await deleteCoachChat(selectedChatId);

      const remainingChats = chats.filter((chat) => chat.id !== selectedChatId);

      setChats(remainingChats);

      if (remainingChats.length > 0) {
        setSelectedChatId(remainingChats[0].id);
      } else {
        setSelectedChatId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to delete Coach chat:", error);
      setError("Unable to delete this chat.");
    } finally {
      setDeletingChat(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || sending) {
      return;
    }

    let chatId = selectedChatId;

    try {
      setSending(true);
      setError(null);

      if (!chatId) {
        const result = await createCoachChat();

        chatId = result.chat.id;

        setChats((current) => [result.chat, ...current]);

        setSelectedChatId(chatId);
      }

      const temporaryUserMessage: CoachMessage = {
        role: "user",
        content: trimmedQuestion,
      };

      setMessages((current) => [...current, temporaryUserMessage]);

      setQuestion("");

      const result = await sendCoachMessage(chatId, trimmedQuestion);

      setMessages((current) => [...current, result.assistantMessage]);

      setChats((current) =>
        current.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: result.title,
                updated_at: new Date().toISOString(),
                message_count: (chat.message_count ?? 0) + 2,
              }
            : chat,
        ),
      );
    } catch (error) {
      console.error("Failed to send Coach message:", error);

      setMessages((current) =>
        current.filter(
          (message) =>
            message.content !== trimmedQuestion || message.role !== "user",
        ),
      );

      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Unable to get a response from MoneyFlow Coach.");
      }
    } finally {
      setSending(false);
    }
  }

  const selectedChat = chats.find((chat) => chat.id === selectedChatId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-0px)] min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-900 lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold">MoneyFlow Coach</h1>

            <p className="text-xs text-slate-500">
              Your financial AI assistant
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleNewChat();
            }}
            disabled={creatingChat}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="New chat"
          >
            {creatingChat ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              void handleNewChat();
            }}
            disabled={creatingChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={17} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loadingChats ? (
            <div className="flex items-center justify-center py-8 text-slate-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <MessageSquare
                size={28}
                className="mx-auto mb-3 text-slate-300"
              />

              <p className="text-sm font-medium text-slate-600">No chats yet</p>

              <p className="mt-1 text-xs text-slate-400">
                Start a conversation with MoneyFlow Coach.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    selectedChatId === chat.id
                      ? "bg-slate-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare
                      size={17}
                      className="mt-0.5 shrink-0 text-slate-400"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {chat.title}
                      </p>

                      {chat.message_count !== undefined && (
                        <p className="mt-1 text-xs text-slate-400">
                          {chat.message_count}{" "}
                          {chat.message_count === 1 ? "message" : "messages"}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Coach header */}
      <div className="shrink-0 border-b border-slate-200 bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">
              MoneyFlow Coach
            </h1>

            <p className="text-xs text-slate-500">
              Your financial AI assistant
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleNewChat();
            }}
            disabled={creatingChat}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="New chat"
          >
            {creatingChat ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
          </button>
        </div>

        <div className="border-t border-slate-100 px-4 py-2">
          {loadingChats ? (
            <div className="flex h-10 items-center justify-center text-slate-400">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <p className="py-2 text-xs text-slate-400">
              No previous chats yet.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`max-w-55 shrink-0 rounded-lg border px-3 py-2 text-left transition ${
                    selectedChatId === chat.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="shrink-0" />

                    <span className="truncate text-xs font-medium">
                      {chat.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main chat */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              {selectedChat?.title ?? "MoneyFlow Coach"}
            </h2>

            <p className="truncate text-xs text-slate-500">
              Ask questions about your finances.
            </p>
          </div>

          {selectedChat && (
            <button
              type="button"
              onClick={() => {
                void handleDeleteChat();
              }}
              disabled={deletingChat}
              className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3"
              title="Delete chat"
            >
              {deletingChat ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Trash2 size={17} />
              )}

              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </header>

        {error && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loadingChat ? (
            <div className="flex h-full items-center justify-center px-4">
              <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
          ) : !selectedChatId ? (
            <div className="flex h-full items-center justify-center px-5">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Bot size={28} className="text-slate-500" />
                </div>

                <h2 className="text-xl font-semibold">MoneyFlow Coach</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ask me about your spending, budgets, goals, or financial
                  patterns.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void handleNewChat();
                  }}
                  disabled={creatingChat}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  <Plus size={17} />
                  Start a Chat
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center px-5">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <Bot size={28} className="text-slate-500" />
                </div>

                <h2 className="text-xl font-semibold">How can I help?</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Ask MoneyFlow Coach anything about your financial records.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-5 px-3 py-5 sm:space-y-6 sm:px-6 sm:py-8">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div
                    key={message.id ?? `${message.role}-${index}`}
                    className={`flex min-w-0 gap-2 sm:gap-3 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                        <Bot size={17} />
                      </div>
                    )}

                    <div
                      className={`min-w-0 max-w-[calc(100%-2.5rem)] rounded-2xl px-3.5 py-3 text-sm leading-6 break-words sm:max-w-[80%] sm:px-4 ${
                        isUser
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
                      }`}
                    >
                      <p className="whitespace-pre-wrap wrap-break-word">
                        {message.content}
                      </p>
                    </div>

                    {isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                        <User size={17} />
                      </div>
                    )}
                  </div>
                );
              })}

              {sending && (
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Bot size={17} />
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                    <Loader2
                      size={18}
                      className="animate-spin text-slate-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex w-full max-w-4xl items-end gap-2 sm:gap-3"
          >
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();

                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask MoneyFlow Coach..."
              rows={1}
              maxLength={1000}
              disabled={sending}
              className="min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 sm:px-4"
            />

            <button
              type="submit"
              disabled={sending || !question.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              title="Send message"
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>

          <p className="mx-auto mt-2 hidden max-w-4xl text-xs text-slate-400 sm:block">
            MoneyFlow Coach uses your financial records to provide context-aware
            responses.
          </p>
        </div>
      </main>
    </div>
  );
}

export default CoachPage;
