"use client";

import { useState, useEffect, useRef } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import { ProtectedRoute } from "@/lib/auth";
import { apiService, ApiError } from "@/lib/api";
import { useChatbot } from "@/app/providers/ChatbotProvider";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  action?: unknown;
};

export default function AIChatPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <AIChatContent />
      </MainLayout>
    </ProtectedRoute>
  );
}

function AIChatContent() {
  const { settings } = useChatbot();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [health, setHealth] = useState<{ enabled: boolean; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const h = await apiService.aiHealth();
        setHealth({ enabled: h.enabled, message: h.message });
      } catch {
        setHealth({ enabled: false, message: "AI service health check failed" });
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    setError("");
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiService.aiChat({
        message: userMsg.content,
        conversation_id: conversationId,
        model: settings.model,
        temperature: settings.temperature,
      });

      setConversationId(res.conversation_id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chat_conversation_id', res.conversation_id);
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.message,
        intent: res.intent,
        action: res.action,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Failed to send message";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  type MinimalEvent = { id: string; title: string; start_time: string; end_time?: string };
  type MinimalTask = { id: string; title: string; due_date?: string; priority?: string };
  type ActionPayload = { event?: MinimalEvent; task?: MinimalTask; events?: MinimalEvent[]; tasks?: MinimalTask[] };

  const renderAction = (m: ChatMessage) => {
    if (!m.action) return null;
    const action = m.action as ActionPayload;
    // Render simple cards for created items or query results
    if (m.intent === "create_event" && action.event) {
      const ev = action.event;
      const endStr = ev.end_time ? new Date(ev.end_time).toLocaleString() : '';
      return (
        <div className="mt-2 border rounded-md p-3 bg-blue-50 text-blue-900 text-sm">
          <div className="font-semibold">Event created</div>
          <div className="mt-1">{ev.title}</div>
          <div className="text-xs text-blue-800">
            {new Date(ev.start_time).toLocaleString()} {endStr ? `→ ${endStr}` : ""}
          </div>
        </div>
      );
    }
    if (m.intent === "create_task" && action.task) {
      const t = action.task;
      return (
        <div className="mt-2 border rounded-md p-3 bg-green-50 text-green-900 text-sm">
          <div className="font-semibold">Task created</div>
          <div className="mt-1">{t.title}</div>
          <div className="text-xs text-green-800 capitalize">Priority: {t.priority}</div>
          {t.due_date && (
            <div className="text-xs text-green-800">Due: {new Date(t.due_date).toLocaleDateString()}</div>
          )}
        </div>
      );
    }
    if (m.intent?.startsWith("query_")) {
      const hasEvents = Array.isArray(action?.events) && action.events!.length > 0;
      const hasTasks = Array.isArray(action?.tasks) && action.tasks!.length > 0;
      return (
        <div className="mt-2 grid gap-2">
          {hasEvents && (
            <div className="border rounded-md p-3 bg-gray-50">
              <div className="font-semibold mb-1">Events</div>
              <ul className="text-sm list-disc ml-5">
                {(action.events as MinimalEvent[]).map((e) => (
                  <li key={e.id}>
                    {e.title} — {new Date(e.start_time).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasTasks && (
            <div className="border rounded-md p-3 bg-gray-50">
              <div className="font-semibold mb-1">Tasks</div>
              <ul className="text-sm list-disc ml-5">
                {(action.tasks as MinimalTask[]).map((t) => {
                  const due = t.due_date ? new Date(t.due_date).toLocaleDateString() : null;
                  return (
                    <li key={t.id}>
                      {t.title} {due ? `— due ${due}` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
            {health && (
              <p className={`text-sm mt-1 ${health.enabled ? "text-green-700" : "text-red-700"}`}>
                {health.message}
              </p>
            )}
          </div>

          <div className="border rounded-xl bg-white shadow-sm h-[65vh] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-10">
                  Start by asking: &quot;What do I have tomorrow?&quot; or &quot;Create a task to call Sarah tomorrow&quot;
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900 border border-gray-200"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                    {m.role === "assistant" && m.intent && (
                      <div className="mt-1 text-[11px] uppercase tracking-wide opacity-70">{m.intent}</div>
                    )}
                    {m.role === "assistant" && renderAction(m)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                  Generating...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3">
              {error && (
                <div className="mb-2 text-sm text-red-600">{error}</div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something or create events/tasks..."
                  rows={2}
                  className="flex-1 resize-none border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || input.trim().length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition ${
                    loading || input.trim().length === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}


