"use client";

import { useState, useEffect, useRef } from "react";
import MainLayout from "@/app/layouts/MainLayout";
import { ProtectedRoute } from "@/lib/auth";
import { apiService, ApiError, AIKbFile, AIKbText, AIKbLink } from "@/lib/api";
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

type TabKey = "chat" | "knowledge";

function AIChatContent() {
  const { settings } = useChatbot();
  const [tab, setTab] = useState<TabKey>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [health, setHealth] = useState<{ enabled: boolean; message: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Knowledge Base state
  const [kbSection, setKbSection] = useState<"files" | "text" | "website">("files");
  const [kbFiles, setKbFiles] = useState<AIKbFile[]>([]);
  const [kbTexts, setKbTexts] = useState<AIKbText[]>([]);
  const [kbLinks, setKbLinks] = useState<AIKbLink[]>([]);
  const [kbUploading, setKbUploading] = useState(false);
  const [kbNewText, setKbNewText] = useState({ title: "", content: "" });
  const [kbNewLink, setKbNewLink] = useState("");

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

  useEffect(() => {
    if (tab !== "knowledge") return;
    (async () => {
      try {
        const res = await apiService.aiKbList();
        setKbFiles(res.files || []);
        setKbTexts(res.texts || []);
        setKbLinks(res.links || []);
      } catch {
        // If backend not ready, keep empty silently
      }
    })();
  }, [tab]);

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
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          {health && (
            <p className={`text-sm mt-1 ${health.enabled ? "text-green-700" : "text-red-700"}`}>
              {health.message}
            </p>
          )}
          {/* Tabs */}
          <div className="mt-4 inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab("chat")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "chat" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Chat
            </button>
            <button
              onClick={() => setTab("knowledge")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === "knowledge" ? "bg-white shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Knowledge Base
            </button>
          </div>
        </div>

        {tab === "chat" && (
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
        )}

        {tab === "knowledge" && (
          <div className="flex h-[calc(100vh-200px)] min-h-[600px] border rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Left Sidebar */}
            <div className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Knowledge Base</h3>
              </div>
              <nav className="flex-1 p-2 space-y-1">
                <button
                  onClick={() => setKbSection("files")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    kbSection === "files"
                      ? "bg-gray-100 text-gray-900 border-l-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Files
                </button>
                <button
                  onClick={() => setKbSection("text")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    kbSection === "text"
                      ? "bg-gray-100 text-gray-900 border-l-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Text
                </button>
                <button
                  onClick={() => setKbSection("website")}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    kbSection === "website"
                      ? "bg-gray-100 text-gray-900 border-l-2 border-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Website
                </button>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto bg-white">
              {kbSection === "files" && (
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Files</h2>
                  </div>
                  <div className="flex-1 p-6 overflow-auto">
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-4">Upload PDF, TXT, DOCX 등 문서를 업로드하여 지식베이스로 사용할 수 있습니다.</p>
                      <div className="flex items-center gap-3">
                        <input id="kb-files" type="file" multiple className="text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('kb-files') as HTMLInputElement | null;
                            if (!input || !input.files || input.files.length === 0) return;
                            setKbUploading(true);
                            try {
                              const res = await apiService.aiKbUpload(Array.from(input.files));
                              setKbFiles((prev) => [...res.files, ...prev]);
                              input.value = '';
                            } catch {
                              // silent for now
                            } finally {
                              setKbUploading(false);
                            }
                          }}
                          disabled={kbUploading}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            kbUploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {kbUploading ? 'Uploading...' : 'Upload'}
                        </button>
                      </div>
                    </div>
                    {kbFiles.length > 0 && (
                      <div className="space-y-2">
                        {kbFiles.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-sm text-gray-900">{f.filename}</span>
                            </div>
                            <span className="text-xs text-gray-500">{Math.round(f.size_bytes/1024)} KB</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {kbFiles.length === 0 && (
                      <div className="text-center text-gray-400 mt-12">
                        <p className="text-sm">No files uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {kbSection === "text" && (
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Text</h2>
                  </div>
                  <div className="flex-1 p-6 overflow-auto">
                    <div className="mb-6">
                      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                        <div className="p-4 border-b border-gray-200">
                          <input
                            value={kbNewText.title}
                            onChange={(e) => setKbNewText({ ...kbNewText, title: e.target.value })}
                            placeholder="Title"
                            className="w-full text-sm font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                          />
                        </div>
                        <div className="p-4">
                          <textarea
                            value={kbNewText.content}
                            onChange={(e) => setKbNewText({ ...kbNewText, content: e.target.value })}
                            rows={12}
                            placeholder="Write content to store as knowledge..."
                            className="w-full text-sm text-gray-700 bg-transparent outline-none resize-none placeholder:text-gray-400"
                          />
                        </div>
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{kbNewText.content.length} characters</span>
                          <button
                            onClick={async () => {
                              if (!kbNewText.title.trim() || !kbNewText.content.trim()) return;
                              try {
                                const saved = await apiService.aiKbCreateText({ title: kbNewText.title.trim(), content: kbNewText.content.trim() });
                                setKbTexts((prev) => [saved, ...prev]);
                                setKbNewText({ title: '', content: '' });
                              } catch {}
                            }}
                            disabled={!kbNewText.title.trim() || !kbNewText.content.trim()}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              !kbNewText.title.trim() || !kbNewText.content.trim()
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                    {kbTexts.length > 0 && (
                      <div className="space-y-4">
                        {kbTexts.map(t => (
                          <div key={t.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-200">
                              <h3 className="text-sm font-medium text-gray-900">{t.title}</h3>
                            </div>
                            <div className="p-4">
                              <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-auto">{t.content}</div>
                            </div>
                            <div className="px-4 py-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500">{t.content.length} characters</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {kbSection === "website" && (
                <div className="h-full flex flex-col">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Website</h2>
                  </div>
                  <div className="flex-1 p-6 overflow-auto">
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 mb-4">웹사이트 URL을 추가하여 지식베이스로 사용할 수 있습니다.</p>
                      <div className="flex items-center gap-2">
                        <input
                          value={kbNewLink}
                          onChange={(e) => setKbNewLink(e.target.value)}
                          placeholder="https://example.com/page"
                          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={async () => {
                            const url = kbNewLink.trim();
                            if (!/^https?:\/\//i.test(url)) return;
                            try {
                              const saved = await apiService.aiKbAddLink({ url });
                              setKbLinks((prev) => [saved, ...prev]);
                              setKbNewLink('');
                            } catch {}
                          }}
                          disabled={!kbNewLink.trim() || !/^https?:\/\//i.test(kbNewLink.trim())}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            !kbNewLink.trim() || !/^https?:\/\//i.test(kbNewLink.trim())
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {kbLinks.length > 0 && (
                      <div className="space-y-2">
                        {kbLinks.map(l => (
                          <div key={l.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                            <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 hover:underline">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              {l.url}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    {kbLinks.length === 0 && (
                      <div className="text-center text-gray-400 mt-12">
                        <p className="text-sm">No website links added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


