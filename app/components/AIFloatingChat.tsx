"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, X, Minus, Wifi, WifiOff, RefreshCw, Send, Settings as SettingsIcon } from "lucide-react";
import { useChatbot } from "@/app/providers/ChatbotProvider";

type WSState = "connecting" | "open" | "closed";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIFloatingChat() {
  const [open, setOpen] = useState(false);
  const [wsState, setWsState] = useState<WSState>("closed");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, setSettings } = useChatbot();
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  const WS_PATH = "/ws/ai"; // backend should handle this path

  useEffect(() => {
    if (!open) return;
    connect();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connect = () => {
    try {
      setWsState("connecting");
      const socket = new WebSocket(`${WS_URL}${WS_PATH}`);
      wsRef.current = socket;

      socket.onopen = () => {
        setWsState("open");
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.message) {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: "assistant", content: data.message },
            ]);
          }
        } catch {
          // Fallback plain text
          setMessages((prev) => [
            ...prev,
            { id: crypto.randomUUID(), role: "assistant", content: String(ev.data) },
          ]);
        }
      };

      socket.onclose = () => {
        setWsState("closed");
      };

      socket.onerror = () => {
        setWsState("closed");
      };
    } catch (e) {
      setWsState("closed");
    }
  };

  const cleanup = () => {
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
    setWsState("closed");
  };

  const reconnect = () => {
    cleanup();
    connect();
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");
    const payload = JSON.stringify({
      message: text,
      model: settings.model,
      temperature: settings.temperature,
    });
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      }
    } catch {}
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const StatusIcon = () => {
    if (wsState === "open") return <Wifi className="w-4 h-4 text-green-600" />;
    if (wsState === "connecting") return <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />;
    return <WifiOff className="w-4 h-4 text-red-600" />;
  };

  // Minimized button
  if (!open) {
    return (
      <button
        aria-label="Open AI Assistant"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[92vw] h-[600px] max-h-[85vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col">
      {/* Header */}
      <div className="h-11 px-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <MessageSquare className="w-4 h-4 text-blue-600" /> AI Assistant
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-600">
            <StatusIcon /> {wsState}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings((s) => !s)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Settings">
            <SettingsIcon className="w-4 h-4" />
          </button>
          {wsState !== "open" && (
            <button onClick={reconnect} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Reconnect">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setOpen(false)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Minimize">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => { cleanup(); setOpen(false); }} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b p-3 bg-gray-50">
          <div className="text-sm font-medium text-gray-800 mb-2">Assistant Settings</div>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Model</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              >
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">gpt-4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Temperature ({settings.temperature.toFixed(1)})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="proactive"
                type="checkbox"
                checked={settings.proactive}
                onChange={(e) => setSettings({ ...settings, proactive: e.target.checked })}
              />
              <label htmlFor="proactive" className="text-sm text-gray-700">Enable proactive suggestions</label>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-6">
            Type your message below to start chatting.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 border border-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={wsState === "open" ? "Message AI..." : "Connecting..."}
            className="flex-1 resize-none border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={send}
            disabled={wsState !== "open" || input.trim().length === 0}
            className={`h-9 w-9 rounded-md flex items-center justify-center shadow-sm ${
              wsState !== "open" || input.trim().length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


